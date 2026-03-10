'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Receipt, TrendingDown, Calendar } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { name: 'Rent', icon: '🏠', color: '#EF4444' },
  { name: 'Electricity', icon: '⚡', color: '#F59E0B' },
  { name: 'Gas', icon: '🔥', color: '#F97316' },
  { name: 'Water', icon: '💧', color: '#3B82F6' },
  { name: 'Salary', icon: '👷', color: '#8B5CF6' },
  { name: 'Transport', icon: '🚛', color: '#10B981' },
  { name: 'Maintenance', icon: '🔧', color: '#6366F1' },
  { name: 'Packaging', icon: '📦', color: '#EC4899' },
  { name: 'Phone/Internet', icon: '📱', color: '#14B8A6' },
  { name: 'Tax', icon: '📋', color: '#DC2626' },
  { name: 'Insurance', icon: '🛡️', color: '#7C3AED' },
  { name: 'Other', icon: '📌', color: '#6B7280' },
];

export default function ExpensesPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ category: 'Rent', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });

  useEffect(() => { fetchExpenses(); }, [filterMonth]);

  async function fetchExpenses() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const startDate = filterMonth + '-01';
    const endDate = filterMonth + '-31';
    const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }

  async function addExpense() {
    if (!form.amount) { toast.error('Amount daalo'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('expenses').insert({ user_id: user.id, category: form.category, amount: Number(form.amount), description: form.description, date: form.date });
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Expense add ho gaya');
    setForm({ category: 'Rent', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
    setShowForm(false);
    fetchExpenses();
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    toast.success('Expense deleted');
    fetchExpenses();
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const categoryTotals = EXPENSE_CATEGORIES.map(cat => ({
    ...cat, total: expenses.filter(e => e.category === cat.name).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const filtered = expenses.filter(e => e.category.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses / Kharche</h1>
          <p className="text-gray-500">Dukaan ke kharche track karo</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={18}/>Add Expense</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2"><TrendingDown size={20} className="text-red-600"/><p className="text-red-600 text-sm font-medium">Total Expenses</p></div>
          <p className="text-2xl font-bold text-red-700 mt-1">Rs.{totalExpenses.toLocaleString()}</p></div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2"><Receipt size={20} className="text-blue-600"/><p className="text-blue-600 text-sm font-medium">Total Entries</p></div>
          <p className="text-2xl font-bold text-blue-700 mt-1">{expenses.length}</p></div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2"><Calendar size={20} className="text-purple-600"/><p className="text-purple-600 text-sm font-medium">Top Category</p></div>
          <p className="text-2xl font-bold text-purple-700 mt-1">{categoryTotals[0]?.name || 'N/A'}</p></div>
      </div>

      {categoryTotals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-6">
          <h3 className="font-semibold mb-3 dark:text-white">Category Breakdown</h3>
          <div className="space-y-2">
            {categoryTotals.map(cat => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-lg">{cat.icon}</span>
                <span className="w-24 text-sm dark:text-gray-300">{cat.name}</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div className="h-4 rounded-full" style={{ width: `${(cat.total / totalExpenses) * 100}%`, backgroundColor: cat.color }}></div></div>
                <span className="text-sm font-medium w-28 text-right dark:text-gray-300">Rs.{cat.total.toLocaleString()}</span>
              </div>))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"/></div>
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"/>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? <div className="text-center py-12 text-gray-500"><Receipt size={48} className="mx-auto mb-3 opacity-50"/><p>No expenses this month</p></div> :
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-750 text-gray-500 border-b dark:border-gray-700"><th className="text-left p-3">Date</th><th className="text-left p-3">Category</th><th className="text-left p-3">Description</th><th className="text-right p-3">Amount</th><th className="text-center p-3">Action</th></tr></thead>
            <tbody>{filtered.map(e => {
              const cat = EXPENSE_CATEGORIES.find(c => c.name === e.category);
              return (
                <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="p-3 dark:text-gray-300">{new Date(e.date).toLocaleDateString('en-PK')}</td>
                  <td className="p-3"><span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: cat?.color + '20', color: cat?.color }}>{cat?.icon} {e.category}</span></td>
                  <td className="p-3 dark:text-gray-300">{e.description || '-'}</td>
                  <td className="p-3 text-right font-medium text-red-600">Rs.{Number(e.amount).toLocaleString()}</td>
                  <td className="p-3 text-center"><button onClick={() => deleteExpense(e.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={16}/></button></td>
                </tr>);})}</tbody>
          </table>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Add Expense</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                <div className="grid grid-cols-4 gap-2">{EXPENSE_CATEGORIES.map(cat => (
                  <button key={cat.name} onClick={() => setForm({ ...form, category: cat.name })} className={`p-2 rounded-lg border text-center text-xs ${form.category === cat.name ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="text-lg">{cat.icon}</div><div className="dark:text-gray-300">{cat.name}</div></button>))}</div></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Amount (Rs.)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional..." className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2 dark:border-gray-600 dark:text-white">Cancel</button>
                <button onClick={addExpense} className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700">Add Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
