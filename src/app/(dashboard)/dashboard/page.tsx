'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, TrendingUp, ShoppingBag, AlertTriangle, Users, Calendar, Package, Receipt } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ todaySales: 0, todayProfit: 0, todayOrders: 0, lowStock: 0, totalCustomers: 0, monthlySales: 0, totalProducts: 0, monthlyExpenses: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const { data: todaySalesData } = await supabase.from('sales').select('*').eq('user_id', user.id).gte('created_at', today);
      const todaySales = (todaySalesData || []).reduce((s, sale) => s + (sale.total || 0), 0);
      const todayOrders = (todaySalesData || []).length;

      const { data: monthlySalesData } = await supabase.from('sales').select('total').eq('user_id', user.id).gte('created_at', monthStart);
      const monthlySales = (monthlySalesData || []).reduce((s, sale) => s + (sale.total || 0), 0);

      const { data: allProducts } = await supabase.from('products').select('*').eq('user_id', user.id);
      const prods = allProducts || [];
      const lowStockList = prods.filter(p => {
        const stock = p.stock_quantity || p.stock || 0;
        const minS = p.min_stock_level || 10;
        return stock > 0 && stock <= minS;
      });
      const outOfStockList = prods.filter(p => (p.stock_quantity || p.stock || 0) === 0);

      const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

      const { data: expData } = await supabase.from('expenses').select('amount').eq('user_id', user.id).gte('created_at', monthStart);
      const monthlyExpenses = (expData || []).reduce((s, e) => s + (e.amount || 0), 0);

      const { data: recentData } = await supabase.from('sales').select('*, customer:customers(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);

      const todaySaleIds = (todaySalesData || []).map(s => s.id);
      let todayProfit = 0;
      if (todaySaleIds.length > 0) {
        const { data: items } = await supabase.from('sale_items').select('product_id, quantity, price').in('sale_id', todaySaleIds);
        if (items) {
          for (const item of items) {
            const prod = prods.find(p => p.id === item.product_id);
            const cost = prod ? (prod.cost_price || 0) : 0;
            todayProfit += ((item.price || 0) - cost) * (item.quantity || 1);
          }
        }
      }

      setStats({ todaySales, todayProfit, todayOrders, lowStock: lowStockList.length + outOfStockList.length, totalCustomers: customerCount || 0, monthlySales, totalProducts: prods.length, monthlyExpenses });
      setRecentSales(recentData || []);
      setLowStockProducts([...outOfStockList, ...lowStockList].slice(0, 10));
    } catch (e) { console.error('Dashboard error:', e); }
    setLoading(false);
  }

  function fmt(n) { return 'Rs. ' + (n || 0).toLocaleString(); }

  const statCards = [
    { title: 'Today Sales', value: fmt(stats.todaySales), icon: DollarSign, color: 'bg-blue-500' },
    { title: 'Today Profit', value: fmt(stats.todayProfit), icon: TrendingUp, color: 'bg-green-500' },
    { title: 'Today Orders', value: String(stats.todayOrders), icon: ShoppingBag, color: 'bg-purple-500' },
    { title: 'Low Stock', value: String(stats.lowStock), icon: AlertTriangle, color: 'bg-red-500' },
    { title: 'Customers', value: String(stats.totalCustomers), icon: Users, color: 'bg-orange-500' },
    { title: 'Monthly Sales', value: fmt(stats.monthlySales), icon: Calendar, color: 'bg-indigo-500' },
    { title: 'Products', value: String(stats.totalProducts), icon: Package, color: 'bg-teal-500' },
    { title: 'Expenses', value: fmt(stats.monthlyExpenses), icon: Receipt, color: 'bg-pink-500' },
  ];

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border dark:border-gray-700">
            <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className="text-white" size={20} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
            <p className="text-xl font-bold dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Recent Sales</h3>
          {recentSales.length === 0 ? (<p className="text-gray-500 text-center py-8">No sales yet. Start selling from POS!</p>) : (
            <div className="space-y-3">{recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                <div><p className="font-medium dark:text-white text-sm">{sale.customer?.name || 'Walk-in'}</p>
                  <p className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}</p></div>
                <div className="text-right"><p className="font-semibold text-green-600">Rs. {(sale.total || 0).toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sale.payment_method === 'cash' ? 'bg-green-100 text-green-700' : sale.payment_method === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{sale.payment_method || 'cash'}</span></div>
              </div>))}</div>)}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Low Stock Items</h3>
          {lowStockProducts.length === 0 ? (<p className="text-gray-500 text-center py-8">All products are well stocked!</p>) : (
            <div className="space-y-3">{lowStockProducts.map((product) => {
              const stock = product.stock_quantity || product.stock || 0;
              return (<div key={product.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                <div><p className="font-medium dark:text-white text-sm">{product.name}</p>
                  <p className="text-xs text-gray-500">Min: {product.min_stock_level || 10}</p></div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${stock === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {stock === 0 ? 'OUT OF STOCK' : stock + ' left'}</span>
              </div>);})}</div>)}
        </div>
      </div>
    </div>
  );
}