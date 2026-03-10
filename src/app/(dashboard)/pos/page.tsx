'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStoreConfig } from '@/store/storeConfig';
import { ShoppingCart, Search, Plus, Minus, Trash2, User, CreditCard, Banknote, Smartphone, X, CheckCircle, Camera, MessageSquare, Printer, Share2 } from 'lucide-react';

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
  const [lastSale, setLastSale] = useState<any>(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [autoBill, setAutoBill] = useState(true);
  const [billSent, setBillSent] = useState(false);
  const barcodeRef = useRef('');
  const barcodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    const saved = localStorage.getItem('auto_bill_whatsapp');
    if (saved !== null) setAutoBill(saved === 'true');
  }, []);

  useEffect(() => {
    if (!scannerOn) return;
    function handleKeyPress(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') {
        const barcode = barcodeRef.current.trim();
        if (barcode.length >= 3) {
          const product = products.find(p => p.barcode === barcode);
          if (product) addToCart(product);
          else alert(`Product not found for barcode: ${barcode}`);
        }
        barcodeRef.current = '';
        return;
      }
      if (e.key.length === 1) {
        barcodeRef.current += e.key;
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => { barcodeRef.current = ''; }, 200);
      }
    }
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [scannerOn, products]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [p, c] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', user.id).order('name'),
      supabase.from('customers').select('*').eq('user_id', user.id).order('name'),
    ]);
    setProducts(p.data || []); setCustomers(c.data || []);
    setLoading(false);
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { alert('Not enough stock!'); return prev; }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      if (product.stock <= 0) { alert('Out of stock!'); return prev; }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev => prev.map(item => {
      if (item.product.id !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return item;
      if (newQty > item.product.stock) { alert('Not enough stock!'); return item; }
      return { ...item, quantity: newQty };
    }));
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const tax = storeConfig.taxRate ? ((subtotal - discountAmount) * storeConfig.taxRate) / 100 : 0;
  const total = subtotal - discountAmount + tax;

  function generateBillText(cartItems: CartItem[], saleTotal: number, saleSubtotal: number, saleDiscount: number, saleTax: number, customer: Customer | null) {
    const storeName = storeConfig.storeName || 'Smart Grocery Mart';
    const storePhone = storeConfig.storePhone || '';
    const storeAddress = storeConfig.storeAddress || '';
    const now = new Date();
    let bill = `🧾 *${storeName}*\n`;
    if (storeAddress) bill += `📍 ${storeAddress}\n`;
    if (storePhone) bill += `📞 ${storePhone}\n`;
    bill += `━━━━━━━━━━━━━━━━━━\n`;
    bill += `📅 ${now.toLocaleDateString()} ⏰ ${now.toLocaleTimeString()}\n`;
    if (customer) bill += `👤 ${customer.name}\n`;
    bill += `━━━━━━━━━━━━━━━━━━\n\n`;
    bill += `*Items:*\n`;
    cartItems.forEach((item, i) => {
      bill += `${i + 1}. ${item.product.name}\n`;
      bill += `   ${item.quantity} x Rs.${item.product.price} = Rs.${(item.quantity * item.product.price).toLocaleString()}\n`;
    });
    bill += `\n━━━━━━━━━━━━━━━━━━\n`;
    bill += `Subtotal: Rs.${saleSubtotal.toLocaleString()}\n`;
    if (saleDiscount > 0) bill += `Discount: -Rs.${saleDiscount.toLocaleString()}\n`;
    if (saleTax > 0) bill += `Tax: Rs.${saleTax.toLocaleString()}\n`;
    bill += `*TOTAL: Rs.${saleTotal.toLocaleString()}*\n`;
    bill += `Payment: ${paymentMethod.toUpperCase()}\n`;
    bill += `━━━━━━━━━━━━━━━━━━\n`;
    bill += `\n✅ Thank you for shopping at ${storeName}!\n`;
    bill += `🙏 We appreciate your business.\n`;
    bill += `📱 Visit us again!`;
    return bill;
  }

  function sendBillWhatsApp(phone: string, billText: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('92') ? cleanPhone : cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : '92' + cleanPhone;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(billText)}`, '_blank');
  }

  function toggleAutoBill() {
    const newVal = !autoBill;
    setAutoBill(newVal);
    localStorage.setItem('auto_bill_whatsapp', String(newVal));
  }

  async function completeSale() {
    if (cart.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentCart = [...cart];
    const currentCustomer = selectedCustomer;
    const currentTotal = total;
    const currentSubtotal = subtotal;
    const currentDiscount = discountAmount;
    const currentTax = tax;

    const { data: sale, error } = await supabase.from('sales').insert({
      user_id: user.id,
      customer_id: currentCustomer?.id || null,
      total: currentTotal,
      subtotal: currentSubtotal,
      discount: currentDiscount,
      tax: currentTax,
      payment_method: paymentMethod,
    }).select().single();

    if (error || !sale) { alert('Error completing sale!'); return; }

    const items = currentCart.map(item => ({
      sale_id: sale.id, product_id: item.product.id,
      quantity: item.quantity, price: item.product.price,
      total: item.quantity * item.product.price
    }));
    await supabase.from('sale_items').insert(items);

    for (const item of currentCart) {
      await supabase.from('products').update({ stock: item.product.stock - item.quantity }).eq('id', item.product.id);
    }

    const billText = generateBillText(currentCart, currentTotal, currentSubtotal, currentDiscount, currentTax, currentCustomer);

    // AUTO SEND BILL via WhatsApp if enabled and customer has phone
    let autoSent = false;
    if (autoBill && currentCustomer?.phone) {
      sendBillWhatsApp(currentCustomer.phone, billText);
      autoSent = true;
    }

    setLastSale({ sale, items: currentCart, customer: currentCustomer, total: currentTotal, subtotal: currentSubtotal, discount: currentDiscount, tax: currentTax, billText });
    setBillSent(autoSent);
    setShowSuccess(true);
    setCart([]); setDiscount(0); setSelectedCustomer(null);
    loadData();
  }

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
  );
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)
  );

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><ShoppingCart className="text-blue-600"/>Point of Sale</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleAutoBill}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${autoBill ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400' : 'bg-gray-50 border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'}`}>
            <MessageSquare size={14}/>Auto Bill {autoBill ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setScannerOn(!scannerOn)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${scannerOn ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 dark:text-white border dark:border-gray-600'}`}>
            <Camera size={14}/>{scannerOn ? 'Scanner ON' : 'Scanner OFF'}
          </button>
        </div>
      </div>

      {/* Auto Bill Info Banner */}
      {autoBill && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600"/>
          <p className="text-sm text-green-700 dark:text-green-400">Auto Bill is ON — WhatsApp bill will be sent automatically to customer after every sale (customer must have phone number)</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products or scan barcode..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="col-span-full text-center text-gray-500 py-8">No products found</p>
              ) : (
                filteredProducts.map(product => (
                  <button key={product.id} onClick={() => addToCart(product)}
                    className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed border-red-200 dark:border-red-800' : 'dark:border-gray-700 hover:border-blue-300'}`}
                    disabled={product.stock <= 0}>
                    <p className="font-medium text-sm dark:text-white truncate">{product.name}</p>
                    <p className="text-blue-600 font-bold text-sm mt-1">Rs. {product.price.toLocaleString()}</p>
                    <p className={`text-xs mt-0.5 ${product.stock <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                      Stock: {product.stock} {product.stock <= 0 && '(Out)'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex flex-col">
          {/* Customer Selection */}
          <div className="mb-3">
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-600"/>
                  <div><p className="text-sm font-medium dark:text-white">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500">{selectedCustomer.phone}</p></div>
                </div>
                <button onClick={() => setSelectedCustomer(null)}><X size={16} className="text-gray-400"/></button>
              </div>
            ) : (
              <div className="relative">
                <button onClick={() => setShowCustomers(!showCustomers)}
                  className="w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <User size={16}/>Select Customer {autoBill ? '(Required for Auto Bill)' : '(Optional)'}
                </button>
                {showCustomers && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg mt-1 z-10 shadow-lg max-h-48 overflow-y-auto">
                    <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Search..." className="w-full px-3 py-2 border-b dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm"/>
                    {filteredCustomers.map(c => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomers(false); setCustomerSearch(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 text-sm dark:text-white">{c.name} - {c.phone}</button>
                    ))}
                    <button onClick={() => { setShowCustomers(false); }}
                      className="w-full text-left px-3 py-2 text-blue-600 text-sm border-t dark:border-gray-700">Walk-in Customer</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-[200px]">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                <div className="text-center"><ShoppingCart size={32} className="mx-auto mb-2 opacity-50"/><p>Cart is empty</p><p className="text-xs">Add products to start a sale</p></div>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-white truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Rs. {item.product.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600"><Minus size={14}/></button>
                    <span className="text-sm font-bold dark:text-white w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600"><Plus size={14}/></button>
                    <p className="text-sm font-bold dark:text-white w-16 text-right">Rs.{(item.product.price * item.quantity).toLocaleString()}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Discount %:</span>
            <input type="number" value={discount} onChange={e => setDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              className="w-16 border rounded px-2 py-1 text-sm text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>

          {/* Totals */}
          <div className="border-t dark:border-gray-700 pt-3 space-y-1">
            <div className="flex justify-between text-sm dark:text-gray-300"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount ({discount}%)</span><span>-Rs. {discountAmount.toLocaleString()}</span></div>}
            {tax > 0 && <div className="flex justify-between text-sm dark:text-gray-300"><span>Tax ({storeConfig.taxRate}%)</span><span>Rs. {tax.toLocaleString()}</span></div>}
            <div className="flex justify-between text-lg font-bold dark:text-white"><span>Total</span><span>Rs. {total.toLocaleString()}</span></div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'online', label: 'Online', icon: Smartphone },
            ].map(method => (
              <button key={method.id} onClick={() => setPaymentMethod(method.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs ${paymentMethod === method.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'dark:border-gray-700 dark:text-gray-400'}`}>
                <method.icon size={16}/>{method.label}
              </button>
            ))}
          </div>

          {/* Complete Sale */}
          <button onClick={completeSale} disabled={cart.length === 0}
            className="w-full mt-3 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle size={18}/>Complete Sale - Rs. {total.toLocaleString()}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && lastSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-2"/>
              <h3 className="font-bold text-xl dark:text-white">Sale Complete!</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">Rs. {lastSale.total.toLocaleString()}</p>
              {billSent && (
                <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                    <CheckCircle size={14}/>Bill sent to {lastSale.customer?.name} via WhatsApp
                  </p>
                </div>
              )}
            </div>

            {/* Bill Preview */}
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4 mb-4 text-xs font-mono">
              <p className="text-center font-bold text-sm dark:text-white">{storeConfig.storeName || 'Smart Grocery Mart'}</p>
              {storeConfig.storeAddress && <p className="text-center text-gray-500">{storeConfig.storeAddress}</p>}
              {storeConfig.storePhone && <p className="text-center text-gray-500">{storeConfig.storePhone}</p>}
              <p className="text-center text-gray-400 mt-1">{new Date().toLocaleString()}</p>
              {lastSale.customer && <p className="text-center dark:text-gray-300 mt-1">Customer: {lastSale.customer.name}</p>}
              <hr className="my-2 dark:border-gray-600"/>
              {lastSale.items.map((item: CartItem, i: number) => (
                <div key={i} className="flex justify-between dark:text-gray-300">
                  <span>{item.product.name} x{item.quantity}</span>
                  <span>Rs.{(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <hr className="my-2 dark:border-gray-600"/>
              <div className="flex justify-between dark:text-gray-300"><span>Subtotal</span><span>Rs.{lastSale.subtotal.toLocaleString()}</span></div>
              {lastSale.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-Rs.{lastSale.discount.toLocaleString()}</span></div>}
              {lastSale.tax > 0 && <div className="flex justify-between dark:text-gray-300"><span>Tax</span><span>Rs.{lastSale.tax.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold dark:text-white text-sm mt-1"><span>TOTAL</span><span>Rs.{lastSale.total.toLocaleString()}</span></div>
              <p className="text-center text-gray-500 mt-2">Payment: {paymentMethod.toUpperCase()}</p>
              <p className="text-center mt-2 dark:text-gray-300">Thank you for shopping!</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {!billSent && lastSale.customer?.phone && (
                <button onClick={() => { sendBillWhatsApp(lastSale.customer.phone, lastSale.billText); setBillSent(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 text-sm font-medium">
                  <MessageSquare size={16}/>Send Bill via WhatsApp
                </button>
              )}

              {!billSent && !lastSale.customer?.phone && (
                <div className="flex gap-2">
                  <input id="manualPhone" placeholder="Enter phone number..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                  <button onClick={() => {
                    const phone = (document.getElementById('manualPhone') as HTMLInputElement)?.value;
                    if (phone) { sendBillWhatsApp(phone, lastSale.billText); setBillSent(true); }
                    else alert('Enter a phone number first');
                  }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1">
                    <MessageSquare size={14}/>Send
                  </button>
                </div>
              )}

              {billSent && (
                <button onClick={() => { sendBillWhatsApp(lastSale.customer?.phone || '', lastSale.billText); }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 dark:text-white py-2.5 rounded-lg text-sm font-medium">
                  <MessageSquare size={16}/>Resend Bill
                </button>
              )}

              <button onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
                <Printer size={16}/>Print Receipt
              </button>

              <button onClick={() => { setShowSuccess(false); setLastSale(null); setBillSent(false); }}
                className="w-full border dark:border-gray-600 dark:text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750">
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
