'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useFestivalStore } from '@/store/festival';
import { t } from '@/i18n';
import { toast } from 'sonner';
import { Settings, Save, Moon, Sun, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [lowStockAlert, setLowStockAlert] = useState('10');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { darkMode, toggleDarkMode, festivalEnabled, toggleFestival, currentFestival, theme } = useFestivalStore();

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setStoreName(data.store_name || '');
      setStorePhone(data.store_phone || '');
      setStoreAddress(data.store_address || '');
      setTaxRate(data.tax_rate?.toString() || '0');
      setLowStockAlert(data.low_stock_alert?.toString() || '10');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      store_name: storeName,
      store_phone: storePhone,
      store_address: storeAddress,
      tax_rate: Number(taxRate),
      low_stock_alert: Number(lowStockAlert),
    });

    if (error) toast.error(error.message);
    else toast.success('Settings saved!');
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold dark:text-white">{t('settings.title')}</h1>

      {/* Store Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
          <Settings size={20} /> Store Information
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.storeName')}</label>
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.storePhone')}</label>
            <input type="tel" value={storePhone} onChange={(e) => setStorePhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.storeAddress')}</label>
            <input type="text" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.taxRate')}</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.lowStockAlert')}</label>
              <input type="number" value={lowStockAlert} onChange={(e) => setLowStockAlert(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
          <Save size={18} /> {saving ? 'Saving...' : t('settings.saveSettings')}
        </button>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold dark:text-white">Appearance</h3>
        <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={20} className="text-blue-500" /> : <Sun size={20} className="text-yellow-500" />}
            <div>
              <p className="font-medium dark:text-white">{t('settings.darkMode')}</p>
              <p className="text-sm text-gray-500">Toggle dark/light theme</p>
            </div>
          </div>
          <button onClick={toggleDarkMode}
            className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-purple-500" />
            <div>
              <p className="font-medium dark:text-white">{t('settings.festivalTheme')}</p>
              <p className="text-sm text-gray-500">
                {currentFestival ? `Active: ${theme?.emoji} ${theme?.name}` : 'No festival currently'}
              </p>
            </div>
          </div>
          <button onClick={toggleFestival}
            className={`w-12 h-6 rounded-full transition-colors ${festivalEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${festivalEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
