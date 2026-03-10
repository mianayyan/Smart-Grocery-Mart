'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Product, Category } from '@/types';
import { toast } from 'sonner';
import { ShoppingCart, Search, Plus, Minus, X, Trash2, CreditCard, Banknote, Smartphone, Building, Printer, ScanBarcode, Camera } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [customerPhone, setCustomerPhone] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const barcodeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchData(); }, []);

  // Barcode Gun Listener - detects rapid keystrokes
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const target = e.target as HTMLElement;
      
      // If typing in an input field (not search), ignore
      if (target.tagName === 'INPUT' && target !== searchRef.current && !scannerMode) return;
      if (target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter' && buffer.length >= 4) {
        e.preventDefault();
        handleBarcodeScan(buffer);
        buffer = '';
        return;
      }

      if (now - lastKeyTime > 100) {
        buffer = '';
      }

      if (e.key.length === 1) {
        buffer += e.key;
        lastKeyTime = now;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart, scannerMode]);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prodData } = await supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true).order('name');
    const { data: catData } = await supabase.from('categories').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('name');
    setProducts(prodData || []);
    setCategories(catData || []);
    setLoading(false);
  }

  function handleBarcodeScan(barcode: string) {
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      addToCart(product);
      toast.success(`${product.name} scanned!`, { icon: '📦' });
    } else {
      toast.error(`Product not found: ${barcode}`, { icon: '❌' });
    }
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) { toast.error('Stock limit!'); return prev; }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock_quantity <= 0) { toast.error('Out of stock!'); return prev; }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== productId)); return; }
    const item = cart.find(i => i.product.id === productId);
    if (item && qty > item.product.stock_quantity) { toast.error('Stock limit!'); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  }

  const subtotal = cart.reduce((s, i) => s + i.product.selling_price * i.quantity, 0);
  const total = subtotal - discount;
  const profit = cart.reduce((s, i) => s + (i.product.selling_price - i.product.cost_price) * i.quantity, 0) - discount;

  async function completeSale() {
    if (cart.length === 0) { toast.error('Cart empty!'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const invoiceNum = 'INV-' + Date.now().toString(36).toUpperCase();

    let customerId = null;
    if (customerPhone) {
      const { data: cust } = await supabase.from('customers').select('id').eq('user_id', user.id).eq('phone', customerPhone).single();
      customerId = cust?.id || null;
    }

    const { data: sale, error } = await supabase.from('sales').insert({
      user_id: user.id, customer_id: customerId, invoice_number: invoiceNum,
      subtotal, tax_amount: 0, discount_amount: discount, total_amount: total,
      profit_amount: profit, payment_method: paymentMethod, payment_status: 'paid'
    }).select().single();

    if (error) { toast.error('Sale error: ' + error.message); return; }

    for (const item of cart) {
      await supabase.from('sale_items').insert({
        sale_id: sale.id, product_id: item.product.id, product_name: item.product.name,
        quantity: item.quantity, unit_price: item.product.selling_price,
        cost_price: item.product.cost_price, total_price: item.product.selling_price * item.quantity,
        profit: (item.product.selling_price - item.product.cost_price) * item.quantity
      });
      await supabase.from('products').update({
        stock_quantity: item.product.stock_quantity - item.quantity
      }).eq('id', item.product.id);
    }

    if (customerId) {
      const { data: custData } = await supabase.from('customers').select('total_purchases, total_spent').eq('id', customerId).single();
      if (custData) {
        await supabase.from('customers').update({
          total_purchases: (custData.total_purchases || 0) + 1,
          total_spent: (custData.total_spent || 0) + total,
          last_purchase_date: new Date().toISOString()
        }).eq('id', customerId);
      }
    }

    toast.success(`Sale Complete! ${invoiceNum}`, { icon: '🎉' });
    printReceipt(invoiceNum);
    setCart([]); setDiscount(0); setCustomerPhone(''); setShowPayment(false);
    fetchData();
  }

  function printReceipt(invoiceNum: string) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Receipt</title>
      <style>body{font-family:monospace;width:300px;margin:0 auto;padding:10px;font-size:12px}
      .center{text-align:center}.line{border-top:1px dashed #000;margin:5px 0}
      .row{display:flex;justify-content:space-between}.bold{font-weight:bold}
      .big{font-size:16px}</style></head><body>
      <div class="center bold big">Smart Grocery Mart</div>
      <div class="center">Complete Store Management</div>
      <div class="line"></div>
      <div class="row"><span>Invoice:</span><span>${invoiceNum}</span></div>
      <div class="row"><span>Date:</span><span>${new Date().toLocaleString('en-PK')}</span></div>
      ${customerPhone ? `<div class="row"><span>Customer:</span><span>${customerPhone}</span></div>` : ''}
      <div class="line"></div>
      ${cart.map(i => `<div class="row"><span>${i.product.name} x${i.quantity}</span><span>Rs.${(i.product.selling_price * i.quantity).toLocaleString()}</span></div>`).join('')}
      <div class="line"></div>
      <div class="row"><span>Subtotal:</span><span>Rs.${subtotal.toLocaleString()}</span></div>
      ${discount > 0 ? `<div class="row"><span>Discount:</span><span>-Rs.${discount.toLocaleString()}</span></div>` : ''}
      <div class="row bold big"><span>TOTAL:</span><span>Rs.${total.toLocaleString()}</span></div>
      <div class="row"><span>Payment:</span><span>${paymentMethod.toUpperCase()}</span></div>
      <div class="line"></div>
      <div class="center">Thank you for shopping!</div>
      <div class="center">Powered by Smart Grocery Mart</div>
      <div class="center" style="margin-top:5px;font-size:10px">Developed by Mian Fahad</div>
      </body></html>`);
    w.document.close();
    w.print();
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.includes(search);
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Point of Sale</h1>
          <p className="text-gray-500 text-sm">Scan barcode or search products</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScannerMode(!scannerMode)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${scannerMode ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border dark:border-gray-700'}`}>
            <ScanBarcode size={16}/>{scannerMode ? 'Scanner ON' : 'Scanner OFF'}
          </button>
        </div>
      </div>

      {scannerMode && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center animate-pulse">
              <ScanBarcode className="text-white" size={20}/>
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-400">Barcode Scanner Active</p>
              <p className="text-sm text-green-600">Scan any barcode with USB/Bluetooth reader — product auto-add hoga cart mein</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search product or scan barcode..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"/>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-gray-300'}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${selectedCategory === c.id ? 'text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-gray-300'}`}
                style={selectedCategory === c.id ? { backgroundColor: c.color } : {}}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(p => {
              const cat = categories.find(c => c.id === p.category_id);
              const inCart = cart.find(i => i.product.id === p.id);
              return (
                <div key={p.id} onClick={() => addToCart(p)}
                  className={`bg-white dark:bg-gray-800 rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all
                  ${inCart ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'dark:border-gray-700'}
                  ${p.stock_quantity <= 0 ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    {cat && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.color + '20', color: cat.color }}>{cat.icon} {cat.name}</span>}
                    {inCart && <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{inCart.quantity}</span>}
                  </div>
                  <p className="font-semibold text-sm dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.barcode || 'No barcode'}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-lg font-bold text-green-600">Rs.{p.selling_price}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock_quantity <= p.min_stock_level ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {p.stock_quantity} left</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-50"/>
                <p>No products found</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 h-fit sticky top-4">
          <h2 className="font-bold text-lg dark:text-white mb-3 flex items-center gap-2">
            <ShoppingCart size={20}/>Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
          </h2>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-50"/>
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Scan barcode or click product to add</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate dark:text-white">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Rs.{item.product.selling_price}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"><Minus size={14}/></button>
                      <span className="w-8 text-center text-sm font-bold dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"><Plus size={14}/></button>
                    </div>
                    <p className="text-sm font-bold w-16 text-right dark:text-white">Rs.{(item.product.selling_price * item.quantity).toLocaleString()}</p>
                    <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="text-red-500 p-1"><X size={14}/></button>
                  </div>
                ))}
              </div>

              <div className="border-t dark:border-gray-700 pt-3 space-y-2 mb-4">
                <div className="flex justify-between text-sm dark:text-gray-300"><span>Subtotal</span><span>Rs.{subtotal.toLocaleString()}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-sm dark:text-gray-300">Discount</span>
                  <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value) || 0)}
                    className="w-24 ml-auto border rounded px-2 py-1 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                </div>
                <div className="flex justify-between text-lg font-bold dark:text-white border-t dark:border-gray-700 pt-2">
                  <span>Total</span><span>Rs.{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600"><span>Profit</span><span>Rs.{profit.toLocaleString()}</span></div>
              </div>

              <div className="mb-3">
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Customer phone (optional)"
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>

              <div className="grid grid-cols-5 gap-1 mb-3">
                {[
                  { id: 'cash', icon: Banknote, label: 'Cash' },
                  { id: 'card', icon: CreditCard, label: 'Card' },
                  { id: 'jazzcash', icon: Smartphone, label: 'Jazz' },
                  { id: 'easypaisa', icon: Smartphone, label: 'Easy' },
                  { id: 'bank', icon: Building, label: 'Bank' }
                ].map(m => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    className={`p-2 rounded-lg text-center text-xs ${paymentMethod === m.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
                    <m.icon size={16} className="mx-auto mb-1"/>{m.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setCart([]); setDiscount(0); }}
                  className="flex-1 border border-red-300 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-50 text-sm">
                  <Trash2 size={16} className="inline mr-1"/>Clear
                </button>
                <button onClick={completeSale}
                  className="flex-[2] bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2">
                  <Printer size={16}/>Complete Sale
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
