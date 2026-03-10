'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStoreConfig } from '@/store/storeConfig';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart, Filter, Printer } from 'lucide-react';

interface Sale { id: string; total: number; payment_method: string; created_at: string; customer_id: string; }
interface SaleItem { id: string; sale_id: string; product_id: string; quantity: number; price: number; total: number; }
interface Product { id: string; name: string; price: number; stock: number; cost_price: number; category_id: string; }
interface Customer { id: string; name: string; phone: string; }
interface Expense { id: string; category: string; amount: number; description: string; date: string; }
interface KhataEntry { id: string; customer_id: string; type: string; amount: number; created_at: string; }

export default function ReportsPage() {
  const supabase = createClient();
  const storeConfig = useStoreConfig();
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [khata, setKhata] = useState<KhataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    loadData();
  }, []);

  useEffect(() => {
    const now = new Date();
    if (dateRange === 'today') {
      setStartDate(now.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (dateRange === 'week') {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (dateRange === 'month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (dateRange === 'year') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  }, [dateRange]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [s, si, p, c, e, k] = await Promise.all([
      supabase.from('sales').select('*').eq('user_id', user.id),
      supabase.from('sale_items').select('*'),
      supabase.from('products').select('*').eq('user_id', user.id),
      supabase.from('customers').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id),
      supabase.from('khata').select('*').eq('user_id', user.id),
    ]);
    setSales(s.data || []); setSaleItems(si.data || []); setProducts(p.data || []);
    setCustomers(c.data || []); setExpenses(e.data || []); setKhata(k.data || []);
    setLoading(false);
  }

  function getFilteredData() {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const filteredSales = sales.filter(s => { const d = new Date(s.created_at); return d >= start && d <= end; });
    const filteredExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; });
    const filteredKhata = khata.filter(k => { const d = new Date(k.created_at); return d >= start && d <= end; });
    const saleIds = filteredSales.map(s => s.id);
    const filteredItems = saleItems.filter(si => saleIds.includes(si.sale_id));
    return { filteredSales, filteredExpenses, filteredKhata, filteredItems };
  }

  async function generatePDF(type: string) {
    setGenerating(type);
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import('jspdf-autotable');
    const doc = new jsPDF();
    const { filteredSales, filteredExpenses, filteredKhata, filteredItems } = getFilteredData();

    const storeName = storeConfig.storeName || 'Smart Grocery Mart';
    const storePhone = storeConfig.storePhone || '';
    const storeAddress = storeConfig.storeAddress || '';

    function addHeader(title: string) {
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text(storeName, 105, 20, { align: 'center' });
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      if (storeAddress) doc.text(storeAddress, 105, 27, { align: 'center' });
      if (storePhone) doc.text('Phone: ' + storePhone, 105, 32, { align: 'center' });
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text(title, 105, storeAddress ? 42 : 35, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${startDate} to ${endDate}`, 105, storeAddress ? 48 : 41, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, storeAddress ? 53 : 46, { align: 'center' });
      return storeAddress ? 60 : 52;
    }

    function addFooter() {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        doc.text(`${storeName} - Powered by Smart Grocery Mart`, 105, 295, { align: 'center' });
      }
    }

    if (type === 'sales') {
      let y = addHeader('Sales Report');
      const totalRevenue = filteredSales.reduce((s, sale) => s + (sale.total || 0), 0);
      const avgSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Total Sales: ${filteredSales.length}`, 14, y); y += 5;
      doc.text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`, 14, y); y += 5;
      doc.text(`Average Sale: Rs. ${avgSale.toFixed(0)}`, 14, y); y += 5;

      const cashSales = filteredSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total, 0);
      const cardSales = filteredSales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + s.total, 0);
      const onlineSales = filteredSales.filter(s => !['cash','card'].includes(s.payment_method)).reduce((sum, s) => sum + s.total, 0);
      doc.text(`Cash: Rs. ${cashSales.toLocaleString()} | Card: Rs. ${cardSales.toLocaleString()} | Online: Rs. ${onlineSales.toLocaleString()}`, 14, y);
      y += 10;

      const tableData = filteredSales.map((s, i) => {
        const customer = customers.find(c => c.id === s.customer_id);
        return [i + 1, new Date(s.created_at).toLocaleDateString(), new Date(s.created_at).toLocaleTimeString(), customer?.name || 'Walk-in', s.payment_method, `Rs. ${s.total.toLocaleString()}`];
      });

      (doc as any).autoTable({
        startY: y, head: [['#', 'Date', 'Time', 'Customer', 'Payment', 'Amount']],
        body: tableData, theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }, alternateRowStyles: { fillColor: [245, 247, 250] }
      });
      addFooter();
      doc.save(`${storeName}_Sales_Report_${startDate}_${endDate}.pdf`);

    } else if (type === 'inventory') {
      let y = addHeader('Inventory Report');
      const totalValue = products.reduce((s, p) => s + ((p.cost_price || p.price) * (p.stock || 0)), 0);
      const lowStock = products.filter(p => (p.stock || 0) <= (storeConfig.lowStockAlert || 10));
      const outOfStock = products.filter(p => (p.stock || 0) === 0);

      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Total Products: ${products.length}`, 14, y); y += 5;
      doc.text(`Total Inventory Value: Rs. ${totalValue.toLocaleString()}`, 14, y); y += 5;
      doc.text(`Low Stock Items: ${lowStock.length}`, 14, y); y += 5;
      doc.text(`Out of Stock: ${outOfStock.length}`, 14, y); y += 10;

      const tableData = products.map((p, i) => [
        i + 1, p.name, `Rs. ${(p.cost_price || 0).toLocaleString()}`, `Rs. ${p.price.toLocaleString()}`,
        p.stock || 0, `Rs. ${((p.cost_price || p.price) * (p.stock || 0)).toLocaleString()}`
      ]);

      (doc as any).autoTable({
        startY: y, head: [['#', 'Product', 'Cost', 'Sell Price', 'Stock', 'Value']],
        body: tableData, theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }, alternateRowStyles: { fillColor: [245, 247, 250] }
      });
      addFooter();
      doc.save(`${storeName}_Inventory_Report_${endDate}.pdf`);

    } else if (type === 'profit') {
      let y = addHeader('Profit & Loss Report');
      const totalRevenue = filteredSales.reduce((s, sale) => s + (sale.total || 0), 0);
      const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalCost = filteredItems.reduce((s, item) => {
        const product = products.find(p => p.id === item.product_id);
        return s + ((product?.cost_price || 0) * item.quantity);
      }, 0);
      const grossProfit = totalRevenue - totalCost;
      const netProfit = grossProfit - totalExpenses;

      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Income', 14, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`, 14, y); y += 5;
      doc.text(`Cost of Goods Sold: Rs. ${totalCost.toLocaleString()}`, 14, y); y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Gross Profit: Rs. ${grossProfit.toLocaleString()}`, 14, y); y += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('Expenses', 14, y); y += 6;
      doc.setFont('helvetica', 'normal');

      const expByCategory: Record<string, number> = {};
      filteredExpenses.forEach(e => { expByCategory[e.category] = (expByCategory[e.category] || 0) + e.amount; });
      Object.entries(expByCategory).forEach(([cat, amt]) => {
        doc.text(`${cat}: Rs. ${amt.toLocaleString()}`, 14, y); y += 5;
      });
      doc.text(`Total Expenses: Rs. ${totalExpenses.toLocaleString()}`, 14, y); y += 8;

      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.setTextColor(netProfit >= 0 ? 0 : 255, netProfit >= 0 ? 128 : 0, 0);
      doc.text(`Net Profit: Rs. ${netProfit.toLocaleString()}`, 14, y);
      doc.setTextColor(0, 0, 0); y += 10;

      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Profit Margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`, 14, y);
      addFooter();
      doc.save(`${storeName}_ProfitLoss_Report_${startDate}_${endDate}.pdf`);

    } else if (type === 'customer') {
      let y = addHeader('Customer Report');
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(`Total Customers: ${customers.length}`, 14, y); y += 10;

      const tableData = customers.map((c, i) => {
        const custSales = filteredSales.filter(s => s.customer_id === c.id);
        const custTotal = custSales.reduce((s, sale) => s + sale.total, 0);
        const custKhata = filteredKhata.filter(k => k.customer_id === c.id);
        const credit = custKhata.filter(k => k.type === 'credit').reduce((s, k) => s + k.amount, 0);
        const paid = custKhata.filter(k => k.type === 'payment').reduce((s, k) => s + k.amount, 0);
        return [i + 1, c.name, c.phone || '-', custSales.length, `Rs. ${custTotal.toLocaleString()}`, `Rs. ${(credit - paid).toLocaleString()}`];
      });

      (doc as any).autoTable({
        startY: y, head: [['#', 'Name', 'Phone', 'Orders', 'Total Spent', 'Balance']],
        body: tableData, theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }, alternateRowStyles: { fillColor: [245, 247, 250] }
      });
      addFooter();
      doc.save(`${storeName}_Customer_Report_${startDate}_${endDate}.pdf`);

    } else if (type === 'expense') {
      let y = addHeader('Expense Report');
      const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(`Total Expenses: Rs. ${totalExp.toLocaleString()}`, 14, y); y += 10;

      const tableData = filteredExpenses.map((e, i) => [
        i + 1, e.date, e.category, e.description || '-', `Rs. ${e.amount.toLocaleString()}`
      ]);

      (doc as any).autoTable({
        startY: y, head: [['#', 'Date', 'Category', 'Description', 'Amount']],
        body: tableData, theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }, alternateRowStyles: { fillColor: [245, 247, 250] }
      });
      addFooter();
      doc.save(`${storeName}_Expense_Report_${startDate}_${endDate}.pdf`);
    }

    setGenerating('');
  }

  const { filteredSales, filteredExpenses, filteredKhata, filteredItems } = loading ? { filteredSales: [], filteredExpenses: [], filteredKhata: [], filteredItems: [] } : getFilteredData();
  const totalRevenue = filteredSales.reduce((s, sale) => s + (sale.total || 0), 0);
  const totalExpensesAmt = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalCost = filteredItems.reduce((s, item) => { const p = products.find(pr => pr.id === item.product_id); return s + ((p?.cost_price || 0) * item.quantity); }, 0);
  const netProfit = totalRevenue - totalCost - totalExpensesAmt;

  const reports = [
    { id: 'sales', name: 'Sales Report', desc: 'Complete sales with payment methods, customers, and totals', icon: ShoppingCart, color: 'blue' },
    { id: 'profit', name: 'Profit & Loss', desc: 'Revenue, costs, expenses breakdown and net profit', icon: TrendingUp, color: 'green' },
    { id: 'inventory', name: 'Inventory Report', desc: 'All products with stock levels, values, and alerts', icon: Package, color: 'purple' },
    { id: 'customer', name: 'Customer Report', desc: 'Customer spending, orders, and outstanding balances', icon: Users, color: 'orange' },
    { id: 'expense', name: 'Expense Report', desc: 'All expenses categorized with dates and descriptions', icon: TrendingDown, color: 'red' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30', green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30', orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30'
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><FileText className="text-blue-600"/>Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Generate detailed PDF reports for your business</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2"><Filter size={18} className="text-gray-500"/><span className="text-sm font-medium dark:text-white">Date Range:</span></div>
          <div className="flex gap-2 flex-wrap">
            {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }, { id: 'year', label: 'This Year' }, { id: 'custom', label: 'Custom' }].map(d => (
              <button key={d.id} onClick={() => setDateRange(d.id)}
                className={`px-3 py-1.5 rounded-lg text-sm ${dateRange === d.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>{d.label}</button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex gap-2 items-center">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              <span className="text-gray-500">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1"><ShoppingCart size={18}/><span className="text-sm">Revenue</span></div>
          <p className="text-xl font-bold dark:text-white">Rs. {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{filteredSales.length} sales</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1"><TrendingDown size={18}/><span className="text-sm">Expenses</span></div>
          <p className="text-xl font-bold dark:text-white">Rs. {totalExpensesAmt.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{filteredExpenses.length} entries</p>
        </div>
        <div className={`bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4`}>
          <div className={`flex items-center gap-2 mb-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}><DollarSign size={18}/><span className="text-sm">Net Profit</span></div>
          <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rs. {netProfit.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}% margin</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1"><Package size={18}/><span className="text-sm">Products</span></div>
          <p className="text-xl font-bold dark:text-white">{products.length}</p>
          <p className="text-xs text-gray-500">{products.filter(p => (p.stock || 0) <= 10).length} low stock</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => (
          <div key={report.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-3 rounded-xl ${colorMap[report.color]}`}><report.icon size={24}/></div>
            </div>
            <h3 className="font-bold dark:text-white mb-1">{report.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{report.desc}</p>
            <button onClick={() => generatePDF(report.id)} disabled={generating === report.id}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {generating === report.id ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/>Generating...</>
              ) : (
                <><Download size={16}/>Download PDF</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
