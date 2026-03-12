'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product } from '@/types';
import { toast } from 'sonner';
import { Camera, CameraOff, Search, Plus, Minus, ShoppingCart, X, Package, ScanBarcode, Keyboard } from 'lucide-react';

interface CartItem { product: Product; quantity: number; }

export default function ScannerPage() {
  const supabase = createClient();
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanMode, setScanMode] = useState<'camera' | 'gun' | 'manual'>('gun');
  const [lastScanTime, setLastScanTime] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef<any>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProducts(); }, []);

  // Barcode Gun Auto-Detect
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;
      if (target.tagName === 'INPUT' && target !== barcodeInputRef.current) return;

      if (e.key === 'Enter' && buffer.length >= 4) {
        e.preventDefault();
        handleScan(buffer);
        buffer = '';
        if (barcodeInputRef.current) barcodeInputRef.current.value = '';
        return;
      }
      if (now - lastKeyTime > 100) buffer = '';
      if (e.key.length === 1) { buffer += e.key; lastKeyTime = now; }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  async function fetchProducts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true).order('name');
    setProducts(data || []);
    setLoading(false);
  }

  async function startCamera() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrboxFunction: (w: number, h: number) => ({ width: Math.min(w, 300), height: Math.min(h, 150) }) },
        (decodedText: string) => { handleScan(decodedText); },
        () => {}
      );
      setScanning(true);
      setScanMode('camera');
      toast.success('Camera started!');
    } catch (err: any) {
      toast.error('Camera error: ' + (err?.message || 'Permission denied'));
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  function handleScan(barcode: string) {
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      setScannedProduct(product);
      addToCart(product);
      setScanCount(prev => prev + 1);
      setLastScanTime(new Date().toLocaleTimeString('en-PK'));
      toast.success(`${product.name} scanned!`, { icon: '📦' });
    } else {
      toast.error(`Product not found: ${barcode}`, { icon: '❌' });
    }
  }

  function manualSearch() {
    if (!manualBarcode.trim()) return;
    handleScan(manualBarcode.trim());
    setManualBarcode('');
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error('Stock limit!'); return prev; }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock <= 0) { toast.error('Out of stock!'); return prev; }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== productId)); return; }
    const item = cart.find(i => i.product.id === productId);
    if (item && qty > item.product.stock) { toast.error('Stock limit!'); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  }

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const profit = cart.reduce((s, i) => s + (i.product.price - i.product.cost_price) * i.quantity, 0);

  async function completeSale() {
    if (cart.length === 0) { toast.error('Cart empty!'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const invoiceNum = 'INV-' + Date.now().toString(36).toUpperCase();
    const { data: sale, error } = await supabase.from('sales').insert({
      user_id: user.id, invoice_number: invoiceNum, subtotal, tax_amount: 0,
      discount_amount: 0, total_amount: subtotal, profit_amount: profit,
      payment_method: 'cash', payment_status: 'paid'
    }).select().single();
    if (error) { toast.error('Error: ' + error.message); return; }
    for (const item of cart) {
      await supabase.from('sale_items').insert({
        sale_id: sale.id, product_id: item.product.id, product_name: item.product.name,
        quantity: item.quantity, unit_price: item.product.price,
        cost_price: item.product.cost_price, total_price: item.product.price * item.quantity,
        profit: (item.product.price - item.product.cost_price) * item.quantity
      });
      await supabase.from('products').update({ stock: item.product.stock - item.quantity }).eq('id', item.product.id);
    }
    toast.success(`Sale complete! ${invoiceNum}`, { icon: '🎉' });
    setCart([]); setScannedProduct(null); setScanCount(0);
    fetchProducts();
  }

  const filteredProducts = search ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.includes(search)) : [];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Barcode Scanner</h1>
          <p className="text-gray-500 text-sm">Camera, USB Reader, or Manual entry</p></div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${scanMode === 'gun' ? 'bg-green-100 text-green-700' : scanMode === 'camera' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
            {scanMode === 'gun' ? '🔫 Gun Mode' : scanMode === 'camera' ? '📷 Camera' : '⌨️ Manual'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2"><ScanBarcode size={20} className="text-green-600"/><p className="text-green-600 text-sm font-medium">Scans Today</p></div>
          <p className="text-2xl font-bold text-green-700 mt-1">{scanCount}</p></div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2"><ShoppingCart size={20} className="text-blue-600"/><p className="text-blue-600 text-sm font-medium">Cart Items</p></div>
          <p className="text-2xl font-bold text-blue-700 mt-1">{cart.reduce((s, i) => s + i.quantity, 0)}</p></div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2"><Package size={20} className="text-purple-600"/><p className="text-purple-600 text-sm font-medium">Last Scan</p></div>
          <p className="text-xl font-bold text-purple-700 mt-1">{lastScanTime || 'N/A'}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => { setScanMode('gun'); stopCamera(); }} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${scanMode === 'gun' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
                <ScanBarcode size={16}/>USB/BT Gun</button>
              <button onClick={() => { setScanMode('camera'); if (!scanning) startCamera(); }} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${scanMode === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
                <Camera size={16}/>Camera</button>
              <button onClick={() => { setScanMode('manual'); stopCamera(); }} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${scanMode === 'manual' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
                <Keyboard size={16}/>Manual</button>
            </div>

            {scanMode === 'gun' && (
              <div className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg p-8 text-center bg-green-50/50 dark:bg-green-900/10">
                <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <ScanBarcode className="text-white" size={32}/></div>
                <p className="font-semibold text-green-800 dark:text-green-400 text-lg">USB/Bluetooth Scanner Ready</p>
                <p className="text-green-600 mt-2">Barcode scan karo — product automatically cart mein add hoga</p>
                <p className="text-xs text-green-500 mt-3">Compatible: Any USB or Bluetooth barcode reader gun</p>
              </div>
            )}

            {scanMode === 'camera' && (
              <>
                <div id="scanner-container" className={`w-full rounded-lg overflow-hidden ${scanning ? 'h-64' : 'h-0'}`}></div>
                {!scanning && (
                  <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-8 text-center">
                    <Camera size={48} className="mx-auto mb-3 text-blue-400"/>
                    <p className="text-blue-600">Click to start camera scanner</p>
                    <button onClick={startCamera} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg">Start Camera</button>
                  </div>
                )}
                {scanning && <button onClick={stopCamera} className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg w-full"><CameraOff size={16} className="inline mr-1"/>Stop Camera</button>}
              </>
            )}

            {scanMode === 'manual' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input ref={barcodeInputRef} value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && manualSearch()}
                    placeholder="Type or paste barcode number..."
                    className="flex-1 border rounded-lg px-4 py-3 text-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" autoFocus/>
                  <button onClick={manualSearch} className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium">Search</button>
                </div>
              </div>
            )}
          </div>

          {scannedProduct && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 animate-pulse">
              <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2 text-sm">Last Scanned</h3>
              <div className="flex justify-between items-center">
                <div><p className="font-bold text-lg dark:text-white">{scannedProduct.name}</p>
                  <p className="text-sm text-gray-500">Barcode: {scannedProduct.barcode} | Stock: {scannedProduct.stock}</p></div>
                <p className="text-2xl font-bold text-green-600">Rs.{scannedProduct.price}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h2 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><Search size={18}/>Quick Product Search</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or barcode..."
              className="w-full border rounded-lg px-3 py-2 mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            {filteredProducts.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredProducts.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg cursor-pointer" onClick={() => { addToCart(p); setScanCount(prev => prev + 1); }}>
                    <div><p className="font-medium dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">Barcode: {p.barcode || 'N/A'} | Stock: {p.stock}</p></div>
                    <div className="text-right"><p className="font-bold text-green-600">Rs.{p.price}</p>
                      <button className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mt-1">+ Add</button></div>
                  </div>))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 h-fit sticky top-4">
          <h2 className="font-bold dark:text-white mb-3 flex items-center gap-2"><ShoppingCart size={20}/>Cart ({cart.length})</h2>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><Package size={40} className="mx-auto mb-2 opacity-50"/><p>Cart empty</p><p className="text-xs">Scan to add</p></div>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate dark:text-white">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Rs.{item.product.price}</p></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"><Minus size={14}/></button>
                      <span className="w-8 text-center text-sm font-bold dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"><Plus size={14}/></button>
                    </div>
                    <p className="text-sm font-bold w-20 text-right dark:text-white">Rs.{(item.product.price * item.quantity).toLocaleString()}</p>
                    <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="text-red-500 p-1"><X size={16}/></button>
                  </div>))}
              </div>
              <div className="border-t dark:border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-sm dark:text-gray-300"><span>Subtotal</span><span>Rs.{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm text-green-600"><span>Profit</span><span>Rs.{profit.toLocaleString()}</span></div>
                <div className="flex justify-between text-lg font-bold dark:text-white border-t dark:border-gray-700 pt-2"><span>Total</span><span>Rs.{subtotal.toLocaleString()}</span></div>
              </div>
              <button onClick={completeSale} className="w-full bg-green-600 text-white py-3 rounded-lg mt-4 font-semibold hover:bg-green-700 flex items-center justify-center gap-2">
                <ShoppingCart size={20}/>Complete Sale</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
