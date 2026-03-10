'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/i18n';
import { Supplier } from '@/types';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Truck, Phone, Mail } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', company: '', address: '', notes: '' });
  const supabase = createClient();

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editSupplier) {
      const { error } = await supabase.from('suppliers').update(formData).eq('id', editSupplier.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Supplier updated!');
    } else {
      const { error } = await supabase.from('suppliers').insert({ user_id: user.id, ...formData });
      if (error) { toast.error(error.message); return; }
      toast.success('Supplier added!');
    }
    resetForm();
    fetchSuppliers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    toast.success('Supplier deleted!');
    fetchSuppliers();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormData({ name: supplier.name, phone: supplier.phone || '', email: supplier.email || '', company: supplier.company || '', address: supplier.address || '', notes: supplier.notes || '' });
    setShowForm(true);
  };

  const resetForm = () => { setShowForm(false); setEditSupplier(null); setFormData({ name: '', phone: '', email: '', company: '', address: '', notes: '' }); };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.company?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">{t('suppliers.title')}</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} /> {t('suppliers.addSupplier')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 dark:text-white">{editSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder={t('common.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input type="text" placeholder={t('suppliers.company')} value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="tel" placeholder={t('common.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="email" placeholder={t('common.email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="text" placeholder={t('common.address')} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
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

      <div className="grid gap-3">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">No suppliers found</div>
        ) : (
          filtered.map((supplier) => (
            <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                  <Truck size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-medium dark:text-white">{supplier.name}</p>
                  <p className="text-sm text-gray-500">{supplier.company || 'No company'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {supplier.phone && <span className="flex items-center gap-1"><Phone size={10} /> {supplier.phone}</span>}
                    {supplier.email && <span className="flex items-center gap-1"><Mail size={10} /> {supplier.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(supplier)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Edit size={16} className="text-blue-600" /></button>
                <button onClick={() => handleDelete(supplier.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Trash2 size={16} className="text-red-600" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
