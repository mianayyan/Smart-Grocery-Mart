'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer } from '@/types';
import { toast } from 'sonner';
import { Plus, Search, CreditCard, DollarSign, Phone, MessageSquare, ChevronDown, ChevronUp, Printer } from 'lucide-react';

interface KhataEntry {
  id: string;
  customer_id: string;
  sale_id: string | null;
  type: 'credit' | 'payment';
  amount: number;
  balance: number;
  description: string;
  payment_method: string;
  created_at: string;
}

interface CustomerKhata {
  customer: Customer;
  entries: KhataEntry[];
  totalCredit: number;
  totalPayment: number;
  balance: number;
}

export default function KhataPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<CustomerKhata[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [filterType, setFilterType] = useState<'all' | 'owing' | 'clear'>('all');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: custData } = await supabase.from('customers').select('*').eq('user_id', user.id).order('name');
    setAllCustomers(custData || []);
    const { data: khataData } = await supabase.from('khata').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const customerMap = new Map<string, CustomerKhata>();
    (custData || []).forEach((c: Customer) => {
      const entries = (khataData || []).filter((k: KhataEntry) => k.customer_id === c.id);
      const totalCredit = entries.filter((e: KhataEntry) => e.type === 'credit').reduce((s: number, e: KhataEntry) => s + Number(e.amount), 0);
      const totalPayment = entries.filter((e: KhataEntry) => e.type === 'payment').reduce((s: number, e: KhataEntry) => s + Number(e.amount), 0);
      if (entries.length > 0) {
        customerMap.set(c.id, { customer: c, entries, totalCredit, totalPayment, balance: totalCredit - totalPayment });
      }
    });
    setCustomers(Array.from(customerMap.values()).sort((a, b) => b.balance - a.balance));
    setLoading(false);
  }

  async function addEntry(type: 'credit' | 'payment') {
    if (!selectedCustomer || !amount) { toast.error('Please select customer and enter amount'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = customers.find(c => c.customer.id === selectedCustomer);
    const currentBalance = existing ? existing.balance : 0;
    const newBalance = type === 'credit' ? currentBalance + Number(amount) : currentBalance - Number(amount);
    const { error } = await supabase.from('khata').insert({
      user_id: user.id, customer_id: selectedCustomer, type, amount: Number(amount),
      balance: newBalance, description: description || (type === 'credit' ? 'Credit added' : 'Payment received'),
      payment_method: type === 'payment' ? paymentMethod : null
    });
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success(type === 'credit' ? 'Credit added successfully' : 'Payment recorded successfully');
    setAmount(''); setDescription(''); setSelectedCustomer(''); setShowAddCredit(false); setShowAddPayment(false);
    fetchData();
  }

  function sendWhatsAppReminder(customer: Customer, balance: number) {
    const msg = `Dear ${customer.name}, your outstanding balance is Rs.${balance.toLocaleString()}. Please clear your dues at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function printStatement(ck: CustomerKhata) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Credit Statement - ${ck.customer.name}</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;margin-top:15px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
      .credit{color:red}.payment{color:green}h1{color:#1e40af}
      .summary{display:flex;gap:30px;margin:15px 0;padding:15px;background:#f9fafb;border-radius:8px}</style></head>
      <body><h1>Credit Statement</h1>
      <h2>${ck.customer.name} ${ck.customer.phone ? '| ' + ck.customer.phone : ''}</h2>
      <div class="summary"><div><strong>Total Credit:</strong> Rs.${ck.totalCredit.toLocaleString()}</div>
      <div><strong>Total Payments:</strong> Rs.${ck.totalPayment.toLocaleString()}</div>
      <div><strong>Balance:</strong> Rs.${ck.balance.toLocaleString()}</div></div>
      <table><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance</th></tr>
      ${ck.entries.map(e => `<tr><td>${new Date(e.created_at).toLocaleDateString('en-PK')}</td>
      <td class="${e.type}">${e.type === 'credit' ? 'CREDIT' : 'PAYMENT'}</td>
      <td>${e.description || '-'}</td><td>Rs.${Number(e.amount).toLocaleString()}</td>
      <td>Rs.${Number(e.balance).toLocaleString()}</td></tr>`).join('')}
      </table><p style="margin-top:20px;color:#666">Printed: ${new Date().toLocaleString('en-PK')}</p></body></html>`);
    w.document.close(); w.print();
  }

  const filtered = customers.filter(c => {
    const matchSearch = c.customer.name.toLowerCase().includes(search.toLowerCase()) || c.customer.phone?.includes(search);
    const matchFilter = filterType === 'all' || (filterType === 'owing' && c.balance > 0) || (filterType === 'clear' && c.balance <= 0);
    return matchSearch && matchFilter;
  });

  const totalOwed = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Book</h1>
          <p className="text-gray-500">Track customer credits and payments</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddCredit(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"><Plus size={18}/>Add Credit</button>
          <button onClick={() => setShowAddPayment(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"><DollarSign size={18}/>Add Payment</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-red-600 text-sm font-medium">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-700">Rs.{totalOwed.toLocaleString()}</p></div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-green-600 text-sm font-medium">Total Payments Received</p>
          <p className="text-2xl font-bold text-green-700">Rs.{customers.reduce((s, c) => s + c.totalPayment, 0).toLocaleString()}</p></div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-blue-600 text-sm font-medium">Customers with Credit</p>
          <p className="text-2xl font-bold text-blue-700">{customers.filter(c => c.balance > 0).length}</p></div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..." className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"/></div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <option value="all">All</option><option value="owing">Outstanding</option><option value="clear">Cleared</option></select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? <div className="text-center py-12 text-gray-500"><CreditCard size={48} className="mx-auto mb-3 opacity-50"/><p>No credit entries yet</p></div> :
          filtered.map(ck => (
            <div key={ck.customer.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750" onClick={() => setExpandedCustomer(expandedCustomer === ck.customer.id ? null : ck.customer.id)}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${ck.balance > 0 ? 'bg-red-500' : 'bg-green-500'}`}>{ck.customer.name[0]}</div>
                  <div><p className="font-semibold dark:text-white">{ck.customer.name}</p>
                    <p className="text-sm text-gray-500">{ck.customer.phone}</p></div></div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="text-sm text-gray-500">Balance</p>
                    <p className={`text-lg font-bold ${ck.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Rs.{Math.abs(ck.balance).toLocaleString()}</p></div>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); sendWhatsAppReminder(ck.customer, ck.balance); }} className="p-2 hover:bg-green-100 rounded-lg text-green-600" title="Send WhatsApp Reminder"><MessageSquare size={18}/></button>
                    <button onClick={e => { e.stopPropagation(); printStatement(ck); }} className="p-2 hover:bg-blue-100 rounded-lg text-blue-600" title="Print Statement"><Printer size={18}/></button>
                  </div>
                  {expandedCustomer === ck.customer.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                </div>
              </div>
              {expandedCustomer === ck.customer.id && (
                <div className="border-t dark:border-gray-700 p-4">
                  <table className="w-full text-sm">
                    <thead><tr className="text-gray-500 border-b dark:border-gray-700"><th className="text-left py-2">Date</th><th className="text-left py-2">Type</th><th className="text-left py-2">Description</th><th className="text-right py-2">Amount</th><th className="text-right py-2">Balance</th></tr></thead>
                    <tbody>{ck.entries.map(e => (
                      <tr key={e.id} className="border-b dark:border-gray-700">
                        <td className="py-2 dark:text-gray-300">{new Date(e.created_at).toLocaleDateString('en-PK')} <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span></td>
                        <td className={`py-2 font-medium ${e.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>{e.type === 'credit' ? 'CREDIT' : 'PAYMENT'}</td>
                        <td className="py-2 dark:text-gray-300">{e.description || '-'}</td>
                        <td className={`py-2 text-right font-medium ${e.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>{e.type === 'credit' ? '+' : '-'}Rs.{Number(e.amount).toLocaleString()}</td>
                        <td className="py-2 text-right dark:text-gray-300">Rs.{Number(e.balance).toLocaleString()}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
      </div>

      {(showAddCredit || showAddPayment) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{showAddCredit ? 'Add Credit' : 'Record Payment'}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Customer</label>
                <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select customer...</option>{allCustomers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Amount (Rs.)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder={showAddCredit ? 'Items purchased on credit...' : 'Payment note...'} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              {showAddPayment && <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="cash">Cash</option><option value="jazzcash">JazzCash</option><option value="easypaisa">Easypaisa</option><option value="bank_transfer">Bank Transfer</option></select></div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddCredit(false); setShowAddPayment(false); setAmount(''); setDescription(''); }} className="flex-1 border rounded-lg py-2 dark:border-gray-600 dark:text-white">Cancel</button>
                <button onClick={() => addEntry(showAddCredit ? 'credit' : 'payment')} className={`flex-1 text-white rounded-lg py-2 ${showAddCredit ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{showAddCredit ? 'Add Credit' : 'Record Payment'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
