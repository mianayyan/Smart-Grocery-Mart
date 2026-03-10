'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/store/cart';
import { formatCurrency, createWhatsAppLink } from '@/lib/utils';
import { t } from '@/i18n';
import { Product } from '@/types';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Send,
} from 'lucide-react';

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    discount,
    setDiscount,
    customerPhone,
    setCustomerPhone,
    paymentMethod,
    setPaymentMethod,
    clearCart,
    getSubtotal,
    getTax,
    getTotal,
    getProfit,
  } = useCartStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(name)')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name');
    setProducts(data || []);
    setLoading(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
  );

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty!');
      return;
    }
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find or create customer
      let customerId = null;
      if (customerPhone) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customerPhone)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              user_id: user.id,
              name: 'Walk-in Customer',
              phone: customerPhone,
              segment: 'new',
            })
            .select('id')
            .single();
          customerId = newCustomer?.id;
        }
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          customer_id: customerId,
          invoice_number: invoiceNumber,
          subtotal: getSubtotal(),
          tax_amount: getTax(),
          discount_amount: discount,
          total_amount: getTotal(),
          profit_amount: getProfit(),
          payment_method: paymentMethod,
          payment_status: 'paid',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items & update stock
      for (const item of items) {
        await supabase.from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          cost_price: item.product.cost_price,
          total_price: item.product.selling_price * item.quantity,
          profit: (item.product.selling_price - item.product.cost_price) * item.quantity,
        });

        // Update stock
        await supabase
          .from('products')
          .update({
            stock_quantity: item.product.stock_quantity - item.quantity,
          })
          .eq('id', item.product.id);
      }

      // Update customer totals
      if (customerId) {
        await supabase.rpc('update_customer_totals', {
          p_customer_id: customerId,
          p_amount: getTotal(),
        });
      }

      toast.success(`Sale completed! Invoice: ${invoiceNumber}`);

      // Share on WhatsApp if phone provided
      if (customerPhone) {
        const message = `Thank you for shopping at Smart Grocery Mart!\n\nInvoice: ${invoiceNumber}\nTotal: ${formatCurrency(getTotal())}\nPayment: ${paymentMethod}\n\nVisit us again!`;
        window.open(createWhatsAppLink(customerPhone, message), '_blank');
      }

      clearCart();
      setCheckoutOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)]">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('pos.searchProducts')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No products found
            </div>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  if (product.stock_quantity <= 0) {
                    toast.error('Out of stock!');
                    return;
                  }
                  addItem(product);
                  toast.success(`${product.name} added to cart`);
                }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left border border-gray-100 dark:border-gray-700"
              >
                <div className="text-2xl mb-2">📦</div>
                <h3 className="font-medium text-sm dark:text-white truncate">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-1">{(product.category as any)?.name || 'General'}</p>
                <p className="font-bold text-blue-600">{formatCurrency(product.selling_price)}</p>
                <p className="text-xs text-gray-400">Stock: {product.stock_quantity}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex flex-col border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-semibold text-lg dark:text-white flex items-center gap-2">
            <ShoppingCart size={20} />
            {t('pos.cart')} ({items.length})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('pos.emptyCart')}</p>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm dark:text-white truncate">{item.product.name}</p>
                  <p className="text-sm text-blue-600">{formatCurrency(item.product.selling_price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-medium w-6 text-center dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t dark:border-gray-700 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between dark:text-gray-300">
              <span>{t('pos.subtotal')}</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            <div className="flex justify-between dark:text-gray-300">
              <span>{t('pos.discount')}</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-20 text-right bg-gray-50 dark:bg-gray-700 border rounded px-2 py-0.5 dark:text-white"
              />
            </div>
            <div className="flex justify-between font-bold text-lg dark:text-white pt-2 border-t dark:border-gray-600">
              <span>{t('pos.grandTotal')}</span>
              <span>{formatCurrency(getTotal())}</span>
            </div>
          </div>

          {!checkoutOpen ? (
            <button
              onClick={() => setCheckoutOpen(true)}
              disabled={items.length === 0}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {t('pos.checkout')}
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="tel"
                placeholder={t('pos.customerPhone')}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />

              <div className="grid grid-cols-3 gap-2">
                {[
                  { method: 'cash', icon: Banknote, label: 'Cash' },
                  { method: 'card', icon: CreditCard, label: 'Card' },
                  { method: 'jazzcash', icon: Smartphone, label: 'JazzCash' },
                ].map(({ method, icon: Icon, label }) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs ${
                      paymentMethod === method
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/50'
                        : 'border-gray-200 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : t('pos.completeSale')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
