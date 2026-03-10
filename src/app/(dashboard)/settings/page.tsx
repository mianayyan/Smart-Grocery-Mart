'use client';

import { useState, useEffect } from 'react';
import { useStoreConfig } from '@/store/storeConfig';
import { toast } from 'sonner';
import { Save, Store, Phone, MapPin, Receipt, Percent, AlertTriangle, MessageSquare, Type } from 'lucide-react';

export default function SettingsPage() {
  const config = useStoreConfig();
  const [form, setForm] = useState({
    storeName: '', storePhone: '', storeAddress: '', storeTagline: '',
    taxRate: '0', lowStockAlert: '10', receiptFooter: '', whatsappNumber: '', currency: 'Rs.'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    config.loadConfig().then(() => {
      setForm({
        storeName: config.storeName,
        storePhone: config.storePhone,
        storeAddress: config.storeAddress,
        storeTagline: config.storeTagline,
        taxRate: String(config.taxRate),
        lowStockAlert: String(config.lowStockAlert),
        receiptFooter: config.receiptFooter,
        whatsappNumber: config.whatsappNumber,
        currency: config.currency,
      });
    });
  }, []);

  useEffect(() => {
    if (config.loaded) {
      setForm({
        storeName: config.storeName,
        storePhone: config.storePhone,
        storeAddress: config.storeAddress,
        storeTagline: config.storeTagline,
        taxRate: String(config.taxRate),
        lowStockAlert: String(config.lowStockAlert),
        receiptFooter: config.receiptFooter,
        whatsappNumber: config.whatsappNumber,
        currency: config.currency,
      });
    }
  }, [config.loaded]);

  async function handleSave() {
    setSaving(true);
    const success = await config.updateConfig({
      storeName: form.storeName,
      storePhone: form.storePhone,
      storeAddress: form.storeAddress,
      storeTagline: form.storeTagline,
      taxRate: Number(form.taxRate) || 0,
      lowStockAlert: Number(form.lowStockAlert) || 10,
      receiptFooter: form.receiptFooter,
      whatsappNumber: form.whatsappNumber,
      currency: form.currency,
    });
    setSaving(false);
    if (success) {
      toast.success('Settings saved! Store name updated everywhere.');
    } else {
      toast.error('Error saving settings');
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
        <p className="text-gray-500">Change store name here — it updates everywhere automatically (POS, receipts, marketing, sidebar)</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2"><Store size={20}/>Store Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1"><Store size={14}/>Store Name *</label>
              <input value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value })}
                placeholder="Your store name" className="w-full border rounded-lg px-4 py-3 text-lg font-semibold dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              <p className="text-xs text-blue-600 mt-1">Ye name sidebar, receipts, POS, marketing templates — sab jagah dikhega</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1"><Type size={14}/>Store Tagline</label>
              <input value={form.storeTagline} onChange={e => setForm({ ...form, storeTagline: e.target.value })}
                placeholder="e.g. Fresh Groceries Daily" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1"><Phone size={14}/>Store Phone</label>
                <input value={form.storePhone} onChange={e => setForm({ ...form, storePhone: e.target.value })}
                  placeholder="03XX-XXXXXXX" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1"><MessageSquare size={14}/>WhatsApp Number</label>
                <input value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                  placeholder="923XXXXXXXXX" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1"><MapPin size={14}/>Store Address</label>
              <textarea value={form.storeAddress} onChange={e => setForm({ ...form, storeAddress: e.target.value })}
                placeholder="Full store address" rows={2} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2"><Receipt size={20}/>Billing & Tax</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1"><Percent size={14}/>Tax Rate (%)</label>
              <input type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Currency</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="Rs.">Rs. (PKR)</option><option value="$">$ (USD)</option><option value="€">€ (EUR)</option><option value="£">£ (GBP)</option><option value="₹">₹ (INR)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1"><AlertTriangle size={14}/>Low Stock Alert</label>
              <input type="number" value={form.lowStockAlert} onChange={e => setForm({ ...form, lowStockAlert: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2"><Receipt size={20}/>Receipt Settings</h2>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Receipt Footer Message</label>
            <input value={form.receiptFooter} onChange={e => setForm({ ...form, receiptFooter: e.target.value })}
              placeholder="Thank you for shopping!" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
          <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Preview</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold dark:text-white">{form.storeName || 'Store Name'}</p>
            <p className="text-gray-500 text-sm">{form.storeTagline || 'Your tagline'}</p>
            <p className="text-gray-400 text-xs mt-1">{form.storePhone} | {form.storeAddress}</p>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={18}/>{saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
