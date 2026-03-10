'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { t } from '@/i18n';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Users,
  Calendar,
} from 'lucide-react';

interface Stats {
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  lowStock: number;
  totalCustomers: number;
  monthlySales: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    todaySales: 0,
    todayProfit: 0,
    todayOrders: 0,
    lowStock: 0,
    totalCustomers: 0,
    monthlySales: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('total_amount, profit_amount')
        .gte('created_at', today);

      const todaySales = todaySalesData?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const todayProfit = todaySalesData?.reduce((sum, s) => sum + s.profit_amount, 0) || 0;
      const todayOrders = todaySalesData?.length || 0;

      // Monthly sales
      const { data: monthlySalesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', monthStart);

      const monthlySales = monthlySalesData?.reduce((sum, s) => sum + s.total_amount, 0) || 0;

      // Low stock products
      const { data: lowStockData } = await supabase
        .from('products')
        .select('*')
        .filter('stock_quantity', 'lte', 'min_stock_level')
        .eq('is_active', true);

      // Total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Recent sales
      const { data: recentData } = await supabase
        .from('sales')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        todaySales,
        todayProfit,
        todayOrders,
        lowStock: lowStockData?.length || 0,
        totalCustomers: customerCount || 0,
        monthlySales,
      });
      setRecentSales(recentData || []);
      setLowStockProducts(lowStockData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: t('dashboard.todaySales'), value: formatCurrency(stats.todaySales), icon: DollarSign, color: 'bg-blue-500' },
    { title: t('dashboard.todayProfit'), value: formatCurrency(stats.todayProfit), icon: TrendingUp, color: 'bg-green-500' },
    { title: t('dashboard.todayOrders'), value: stats.todayOrders.toString(), icon: ShoppingBag, color: 'bg-purple-500' },
    { title: t('dashboard.lowStock'), value: stats.lowStock.toString(), icon: AlertTriangle, color: 'bg-red-500' },
    { title: t('dashboard.totalCustomers'), value: stats.totalCustomers.toString(), icon: Users, color: 'bg-orange-500' },
    { title: t('dashboard.monthlySales'), value: formatCurrency(stats.monthlySales), icon: Calendar, color: 'bg-indigo-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">{t('dashboard.title')}</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className="text-white" size={20} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
            <p className="text-xl font-bold dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('dashboard.recentSales')}</h3>
          {recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales yet. Start selling from POS!</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                  <div>
                    <p className="font-medium dark:text-white">{sale.invoice_number}</p>
                    <p className="text-sm text-gray-500">{sale.customer?.name || 'Walk-in'}</p>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(sale.total_amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('dashboard.lowStock')}</h3>
          {lowStockProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">All products are well stocked!</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                  <div>
                    <p className="font-medium dark:text-white">{product.name}</p>
                    <p className="text-sm text-gray-500">Min: {product.min_stock_level}</p>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    {product.stock_quantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
