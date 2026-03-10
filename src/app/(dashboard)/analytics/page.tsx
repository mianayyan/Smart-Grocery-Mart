'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { t } from '@/i18n';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

export default function AnalyticsPage() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, profit: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: sales } = await supabase
        .from('sales')
        .select('total_amount, profit_amount, created_at')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at');

      const revenue = sales?.reduce((s, r) => s + r.total_amount, 0) || 0;
      const profit = sales?.reduce((s, r) => s + r.profit_amount, 0) || 0;
      setTotals({ revenue, profit, orders: sales?.length || 0 });

      // Group by date
      const grouped: Record<string, { sales: number; profit: number; orders: number }> = {};
      sales?.forEach((sale) => {
        const date = sale.created_at.split('T')[0];
        if (!grouped[date]) grouped[date] = { sales: 0, profit: 0, orders: 0 };
        grouped[date].sales += sale.total_amount;
        grouped[date].profit += sale.profit_amount;
        grouped[date].orders += 1;
      });
      setSalesData(Object.entries(grouped).map(([date, data]) => ({ date, ...data })));

      // Top products
      const { data: items } = await supabase
        .from('sale_items')
        .select('product_name, quantity, total_price')
        .gte('created_at', thirtyDaysAgo);

      const productMap: Record<string, { quantity: number; revenue: number }> = {};
      items?.forEach((item) => {
        if (!productMap[item.product_name]) productMap[item.product_name] = { quantity: 0, revenue: 0 };
        productMap[item.product_name].quantity += item.quantity;
        productMap[item.product_name].revenue += item.total_price;
      });
      const sorted = Object.entries(productMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopProducts(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">{t('analytics.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-500 w-10 h-10 rounded-lg flex items-center justify-center"><DollarSign className="text-white" size={20} /></div>
            <div><p className="text-sm text-gray-500">30-Day Revenue</p><p className="text-2xl font-bold dark:text-white">{formatCurrency(totals.revenue)}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-500 w-10 h-10 rounded-lg flex items-center justify-center"><TrendingUp className="text-white" size={20} /></div>
            <div><p className="text-sm text-gray-500">30-Day Profit</p><p className="text-2xl font-bold dark:text-white">{formatCurrency(totals.profit)}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-500 w-10 h-10 rounded-lg flex items-center justify-center"><ShoppingBag className="text-white" size={20} /></div>
            <div><p className="text-sm text-gray-500">30-Day Orders</p><p className="text-2xl font-bold dark:text-white">{totals.orders}</p></div>
          </div>
        </div>
      </div>

      {/* Sales Chart - Simple bar representation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('analytics.salesTrend')}</h3>
        {salesData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales data yet</p>
        ) : (
          <div className="space-y-2">
            {salesData.slice(-10).map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">{day.date.slice(5)}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, (day.sales / Math.max(...salesData.map(d => d.sales))) * 100)}%` }}>
                    <span className="text-xs text-white font-medium">{formatCurrency(day.sales)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('analytics.topProducts')}</h3>
        {topProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No product data yet</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div key={product.name} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="font-medium dark:text-white">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold dark:text-white">{formatCurrency(product.revenue)}</p>
                  <p className="text-xs text-gray-500">{product.quantity} sold</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
