'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { t } from '@/i18n';
import { Customer } from '@/types';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Users, Phone } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', segment: 'regular' as string, notes: '',
  });
  const supabase = createClient();

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const customerData = { user_id: user.id, ...formData };

    if (editCustomer) {
      const { error } = await supabase.from('customers').update(formData).eq('id', editCustomer.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Customer updated!');
    } else {
      const { error } = await supabase.from('customers').insert(customerData);
      if (error) { toast.error(error.message); return; }
      toast.success('Customer added!');
    }
    resetForm();
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    await supabase.from('customers').delete().eq('id', id);
    toast.success('Customer deleted!');
    fetchCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '', segment: customer.segment, notes: customer.notes || '' });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '', segment: 'regular', notes: '' });
  };

  const filtered = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesSegment = segment === 'all' || c.segment === segment;
    return matchesSearch && matchesSegment;
  });

  const segmentColors: Record<string, string> = {
    regular: 'bg-blue-100 text-blue-700', vip: 'bg-purple-100 text-purple-700',
    wholesale: 'bg-green-100 text-green-700', new: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">{t('customers.title')}</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} /> {t('customers.addCustomer')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div className="flex gap-2">
          {['all', 'regular', 'vip', 'wholesale', 'new'].map((s) => (
            <button key={s} onClick={() => setSegment(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${segment === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{editCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder={t('common.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input type="tel" placeholder={t('common.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input type="email" placeholder={t('common.email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="text" placeholder={t('common.address')} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <select value={formData.segment} onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="regular">Regular</option><option value="vip">VIP</option>
                <option value="wholesale">Wholesale</option><option value="new">New</option>
              </select>
              <textarea placeholder={t('common.notes')} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-2 border rounded-lg dark:text-white dark:border-gray-600">{t('common.cancel')}</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customers List */}
      <div className="grid gap-3">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">No customers found</div>
        ) : (
          filtered.map((customer) => (
            <div key={customer.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium dark:text-white">{customer.name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} /> {customer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${segmentColors[customer.segment]}`}>{customer.segment}</span>
                <span className="text-sm font-medium dark:text-white hidden sm:block">{formatCurrency(customer.total_spent || 0)}</span>
                <button onClick={() => handleEdit(customer)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Edit size={16} className="text-blue-600" /></button>
                <button onClick={() => handleDelete(customer.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Trash2 size={16} className="text-red-600" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
