'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStoreConfig } from '@/store/storeConfig';
import { ShoppingCart, Search, Plus, Minus, Trash2, User, CreditCard, Banknote, Smartphone, X, CheckCircle, Camera, MessageSquare, Printer } from 'lucide-react';

interface Product { id: string; name: string; price: number; stock: number; barcode: string; category_id: string; }
interface CartItem { product: Product; quantity: number; }
interface Customer { id: string; name: string; phone: string; }

export default function POSPage() {
  const supabase = createClient();
  const storeConfig = useStoreConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomers, setShowCustomers] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [autoBill, setAutoBill] = useState(true);
  const [billSent, setBillSent] = useState(false);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<any>(null);

  useEffect(() => {
    loadData();
    try {
      const saved = localStorage.getItem('auto_bill_whatsapp');
      if (saved !== null) setAutoBill(saved === 'true');
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!scannerOn) return;
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim();
        if (code.length >= 3) {
          const found = products.find(p => p.barcode === code);
          if (found) addToCart(found);
        }
        barcodeBuffer.current = '';
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 200);
      }
    }
    window.addEventListener('keypress', handleKey);
    return () => window.removeEventListener('keypress', handleKey);
  }, [scannerOn, products]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [p, c] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('name'),
        supabase.from('customers').select('*').eq('user_id', user.id).order('name'),
      ]);
      setProducts(p.data || []);
      setCustomers(c.data || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= (product.stock || 0)) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if ((product.stock || 0) <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const nq = i.quantity + delta;
      if (nq <= 0 || nq > (i.product.stock || 0)) return i;
      return { ...i, quantity: nq };
    }));
  }

  function removeItem(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }

  const subtotal = cart.reduce((s, i) => s + (i.product.price * i.quantity), 0);
  const discAmt = (subtotal * discount) / 100;
  const taxRate = storeConfig.taxRate || 0;
  const taxAmt = taxRate > 0 ? ((subtotal - discAmt) * taxRate) / 100 : 0;
  const total = subtotal - discAmt + taxAmt;

  function makeBillText(items: CartItem[], cust: Customer | null, sTotal: number, sSub: number, sDisc: number, sTax: number) {
    const name = storeConfig.storeName || 'Smart Grocery Mart';
    const addr = storeConfig.storeAddress || '';
    const ph = storeConfig.storePhone || '';
    const now = new Date();
    let b = `🧾 *${name}*\n`;
    if (addr) b += `📍 ${addr}\n`;
    if (ph) b += `📞 ${ph}\n`;
    b += `━━━━━━━━━━━━━━━━━━\n`;
    b += `📅 ${now.toLocaleDateString()} ⏰ ${now.toLocaleTimeString()}\n`;
    if (cust) b += `👤 ${cust.name}\n`;
    b += `━━━━━━━━━━━━━━━━━━\n\n*Items:*\n`;
    items.forEach((it, idx) => {
      b += `${idx + 1}. ${it.product.name}\n   ${it.quantity} x Rs.${it.product.price} = Rs.${(it.quantity * it.product.price).toLocaleString()}\n`;
    });
    b += `\n━━━━━━━━━━━━━━━━━━\n`;
    b += `Subtotal: Rs.${sSub.toLocaleString()}\n`;
    if (sDisc > 0) b += `Discount: -Rs.${sDisc.toLocaleString()}\n`;
    if (sTax > 0) b += `Tax: Rs.${sTax.toLocaleString()}\n`;
    b += `*TOTAL: Rs.${sTotal.toLocaleString()}*\n`;
    b += `Payment: ${paymentMethod.toUpperCase()}\n`;
    b += `━━━━━━━━━━━━━━━━━━\n\n`;
    b += `✅ Thank you for shopping at ${name}!\n🙏 We appreciate your business.\n📱 Visit us again!`;
    return b;
  }

  function openWhatsApp(phone: string, msg: string) {
    const clean = phone.replace(/[^0-9]/g, '');
    const full = clean.startsWith('92') ? clean : clean.startsWith('0') ? '92' + clean.slice(1) : '92' + clean;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function completeSale() {
    if (cart.length === 0) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const saleCart = [...cart];
      const saleCust = selectedCustomer;
      const saleTotal = total;
      const saleSub = subtotal;
      const saleDisc = discAmt;
      const saleTax = taxAmt;

      const { data: sale, error } = await supabase.from('sales').insert({
        user_id: user.id, customer_id: saleCust?.id || null,
        total: saleTotal, subtotal: saleSub, discount: saleDisc,
        tax: saleTax, payment_method: paymentMethod,
      }).select().single();

      if (error || !sale) { alert('Sale error!'); return; }

      await supabase.from('sale_items').insert(
        saleCart.map(i => ({ sale_id: sale.id, product_id: i.product.id, quantity: i.quantity, price: i.product.price, total: i.quantity * i.product.price }))
      );

      for (const i of saleCart) {
        await supabase.from('products').update({ stock: (i.product.stock || 0) - i.quantity }).eq('id', i.product.id);
      }

      const bill = makeBillText(saleCart, saleCust, saleTotal, saleSub, saleDisc, saleTax);

      let sent = false;
      if (autoBill && saleCust && saleCust.phone) {
        openWhatsApp(saleCust.phone, bill);
        sent = true;
      }

      setLastSaleData({ items: saleCart, customer: saleCust, total: saleTotal, subtotal: saleSub, discount: saleDisc, tax: saleTax, bill });
      setBillSent(sent);
      setShowSuccess(true);
      setCart([]); setDiscount(0); setSelectedCustomer(null);
      loadData();
    } catch(e) { console.error(e); alert('Error!'); }
  }

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search));
  const filtCust = customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch));

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><ShoppingCart className="text-blue-600"/>Point of Sale</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { const nv = !autoBill; setAutoBill(nv); localStorage.setItem('auto_bill_whatsapp', String(nv)); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${autoBill ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400' : 'bg-gray-50 border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'}`}>
            <MessageSquare size={14}/>Auto Bill {autoBill ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setScannerOn(!scannerOn)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${scannerOn ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 dark:text-white border dark:border-gray-600'}`}>
            <Camera size={14}/>{scannerOn ? 'Scanner ON' : 'Scanner OFF'}
          </button>
        </div>
      </div>

      {autoBill && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600"/>
          <p className="text-sm text-green-700 dark:text-green-400">Auto Bill ON — Bill will be sent to customer via WhatsApp automatically after sale</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or scan barcode..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="col-span-full text-center text-gray-500 py-8">No products found</p>
              ) : filtered.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className={`p-3 rounded-lg border text-left hover:shadow-md ${(p.stock || 0) <= 0 ? 'opacity-50 cursor-not-allowed border-red-200 dark:border-red-800' : 'dark:border-gray-700 hover:border-blue-300'}`}
                  disabled={(p.stock || 0) <= 0}>
                  <p className="font-medium text-sm dark:text-white truncate">{p.name}</p>
                  <p className="text-blue-600 font-bold text-sm mt-1">Rs. {(p.price || 0).toLocaleString()}</p>
                  <p className={`text-xs mt-0.5 ${(p.stock || 0) <= 5 ? 'text-red-500' : 'text-gray-500'}`}>Stock: {p.stock || 0}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex flex-col">
          <div className="mb-3">
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-600"/>
                  <div><p className="text-sm font-medium dark:text-white">{selectedCustomer.name}</p><p className="text-xs text-gray-500">{selectedCustomer.phone}</p></div>
                </div>
                <button onClick={() => setSelectedCustomer(null)}><X size={16} className="text-gray-400"/></button>
              </div>
            ) : (
              <div className="relative">
                <button onClick={() => setShowCustomers(!showCustomers)}
                  className="w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  <User size={16}/>Select Customer {autoBill ? '(Required for Auto Bill)' : '(Optional)'}
                </button>
                {showCustomers && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg mt-1 z-10 shadow-lg max-h-48 overflow-y-auto">
                    <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search..."
                      className="w-full px-3 py-2 border-b dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"/>
                    {filtCust.map(c => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomers(false); setCustomerSearch(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 text-sm dark:text-white">{c.name} - {c.phone}</button>
                    ))}
                    <button onClick={() => setShowCustomers(false)}
                      className="w-full text-left px-3 py-2 text-blue-600 text-sm border-t dark:border-gray-700">Walk-in Customer</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-[200px]">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                <div className="text-center"><ShoppingCart size={32} className="mx-auto mb-2 opacity-50"/><p>Cart is empty</p></div>
              </div>
            ) : cart.map(i => (
              <div key={i.product.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white truncate">{i.product.name}</p>
                  <p className="text-xs text-gray-500">Rs. {i.product.price} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(i.product.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600"><Minus size={14}/></button>
                  <span className="text-sm font-bold dark:text-white w-6 text-center">{i.quantity}</span>
                  <button onClick={() => updateQty(i.product.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600"><Plus size={14}/></button>
                  <p className="text-sm font-bold dark:text-white w-16 text-right">Rs.{(i.product.price * i.quantity).toLocaleString()}</p>
                  <button onClick={() => removeItem(i.product.id)} className="text-red-500"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Discount %:</span>
            <input type="number" value={discount} onChange={e => setDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              className="w-16 border rounded px-2 py-1 text-sm text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>

          <div className="border-t dark:border-gray-700 pt-3 space-y-1">
            <div className="flex justify-between text-sm dark:text-gray-300"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount ({discount}%)</span><span>-Rs. {discAmt.toLocaleString()}</span></div>}
            {taxAmt > 0 && <div className="flex justify-between text-sm dark:text-gray-300"><span>Tax ({taxRate}%)</span><span>Rs. {taxAmt.toLocaleString()}</span></div>}
            <div className="flex justify-between text-lg font-bold dark:text-white"><span>Total</span><span>Rs. {total.toLocaleString()}</span></div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[{ id: 'cash', label: 'Cash', icon: Banknote }, { id: 'card', label: 'Card', icon: CreditCard }, { id: 'online', label: 'Online', icon: Smartphone }].map(m => (
              <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs ${paymentMethod === m.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'dark:border-gray-700 dark:text-gray-400'}`}>
                <m.icon size={16}/>{m.label}
              </button>
            ))}
          </div>

          <button onClick={completeSale} disabled={cart.length === 0}
            className="w-full mt-3 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle size={18}/>Complete Sale - Rs. {total.toLocaleString()}
          </button>
        </div>
      </div>

      {showSuccess && lastSaleData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-2"/>
              <h3 className="font-bold text-xl dark:text-white">Sale Complete!</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">Rs. {lastSaleData.total.toLocaleString()}</p>
              {billSent && lastSaleData.customer && (
                <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                    <CheckCircle size={14}/>Bill sent to {lastSaleData.customer.name} via WhatsApp
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4 mb-4 text-xs font-mono">
              <p className="text-center font-bold text-sm dark:text-white">{storeConfig.storeName || 'Smart Grocery Mart'}</p>
              {storeConfig.storeAddress && <p className="text-center text-gray-500">{storeConfig.storeAddress}</p>}
              {storeConfig.storePhone && <p className="text-center text-gray-500">{storeConfig.storePhone}</p>}
              <p className="text-center text-gray-400 mt-1">{new Date().toLocaleString()}</p>
              {lastSaleData.customer && <p className="text-center dark:text-gray-300 mt-1">Customer: {lastSaleData.customer.name}</p>}
              <hr className="my-2 dark:border-gray-600"/>
              {lastSaleData.items.map((it: CartItem, idx: number) => (
                <div key={idx} className="flex justify-between dark:text-gray-300">
                  <span>{it.product.name} x{it.quantity}</span>
                  <span>Rs.{(it.product.price * it.quantity).toLocaleString()}</span>
                </div>
              ))}
              <hr className="my-2 dark:border-gray-600"/>
              <div className="flex justify-between font-bold dark:text-white text-sm mt-1"><span>TOTAL</span><span>Rs.{lastSaleData.total.toLocaleString()}</span></div>
              <p className="text-center mt-2 dark:text-gray-300">Thank you for shopping!</p>
            </div>

            <div className="space-y-2">
              {!billSent && lastSaleData.customer?.phone && (
                <button onClick={() => { openWhatsApp(lastSaleData.customer.phone, lastSaleData.bill); setBillSent(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 text-sm">
                  <MessageSquare size={16}/>Send Bill via WhatsApp
                </button>
              )}
              {!billSent && !lastSaleData.customer?.phone && (
                <div className="flex gap-2">
                  <input id="mphn" placeholder="Enter phone number..." className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                  <button onClick={() => { const p = (document.getElementById('mphn') as HTMLInputElement)?.value; if(p){ openWhatsApp(p, lastSaleData.bill); setBillSent(true); } }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1"><MessageSquare size={14}/>Send</button>
                </div>
              )}
              {billSent && (
                <button onClick={() => openWhatsApp(lastSaleData.customer?.phone || '', lastSaleData.bill)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 dark:text-white py-2.5 rounded-lg text-sm">
                  <MessageSquare size={16}/>Resend Bill
                </button>
              )}
              <button onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 text-sm">
                <Printer size={16}/>Print Receipt
              </button>
              <button onClick={() => { setShowSuccess(false); setLastSaleData(null); setBillSent(false); }}
                className="w-full border dark:border-gray-600 dark:text-white py-2.5 rounded-lg text-sm">New Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
