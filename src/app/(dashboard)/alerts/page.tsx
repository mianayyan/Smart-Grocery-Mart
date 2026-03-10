'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStoreConfig } from '@/store/storeConfig';
import { Bell, MessageSquare, Send, Users, Package, CreditCard, Clock, CheckCircle, AlertTriangle, Phone, Settings, Calendar } from 'lucide-react';

interface Customer { id: string; name: string; phone: string; }
interface Product { id: string; name: string; stock: number; expiry_date: string; }
interface KhataEntry { id: string; customer_id: string; type: string; amount: number; }
interface AlertLog { id: string; type: string; recipient: string; message: string; status: string; created_at: string; }

export default function AlertsPage() {
  const supabase = createClient();
  const storeConfig = useStoreConfig();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [khata, setKhata] = useState<KhataEntry[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [alertSettings, setAlertSettings] = useState({ lowStockAlert: true, expiryAlert: true, paymentReminder: true, lowStockThreshold: 10, expiryDays: 7 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [c, p, k] = await Promise.all([
        supabase.from('customers').select('*').eq('user_id', user.id),
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('khata').select('*').eq('user_id', user.id),
      ]);
      setCustomers(c.data || []); setProducts(p.data || []); setKhata(k.data || []);
      try { const saved = JSON.parse(localStorage.getItem('alert_logs') || '[]'); setAlertLogs(saved); } catch(e) {}
      try { const s = JSON.parse(localStorage.getItem('alert_settings') || 'null'); if (s) setAlertSettings(s); } catch(e) {}
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function getBalance(custId: string) {
    const entries = khata.filter(k => k.customer_id === custId);
    const credit = entries.filter(k => k.type === 'credit').reduce((s, k) => s + (k.amount || 0), 0);
    const paid = entries.filter(k => k.type === 'payment').reduce((s, k) => s + (k.amount || 0), 0);
    return credit - paid;
  }

  function getLowStock() { return products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= alertSettings.lowStockThreshold); }
  function getOutOfStock() { return products.filter(p => (p.stock || 0) === 0); }
  function getExpiring() {
    const future = new Date(); future.setDate(future.getDate() + alertSettings.expiryDays);
    return products.filter(p => p.expiry_date && new Date(p.expiry_date) <= future && new Date(p.expiry_date) >= new Date());
  }
  function getExpired() { return products.filter(p => p.expiry_date && new Date(p.expiry_date) < new Date()); }
  function getWithBalance() { return customers.filter(c => getBalance(c.id) > 0).map(c => ({ ...c, balance: getBalance(c.id) })); }

  function openWhatsApp(phone: string, msg: string) {
    const clean = phone.replace(/[^0-9]/g, '');
    const full = clean.startsWith('92') ? clean : clean.startsWith('0') ? '92' + clean.slice(1) : '92' + clean;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
    const log = { id: Date.now().toString(), type: 'whatsapp', recipient: phone, message: msg, status: 'sent', created_at: new Date().toISOString() };
    const updated = [log, ...alertLogs].slice(0, 100);
    setAlertLogs(updated);
    try { localStorage.setItem('alert_logs', JSON.stringify(updated)); } catch(e) {}
  }

  function sendReminder(c: { name: string; phone: string; balance: number }) {
    const store = storeConfig.storeName || 'Smart Grocery Mart';
    openWhatsApp(c.phone, `Dear ${c.name},\n\nFriendly reminder from ${store}.\n\nYour outstanding balance is Rs. ${c.balance.toLocaleString()}.\n\nPlease visit our store to clear your balance.\n\nThank you!\n${store}`);
  }

  function sendBulk() {
    setSending(true);
    getWithBalance().forEach((c, i) => setTimeout(() => sendReminder(c), i * 1000));
    setTimeout(() => setSending(false), getWithBalance().length * 1000 + 500);
  }

  function sendCustom() {
    if (!customMessage || selectedCustomers.length === 0) return;
    setSending(true);
    const sel = customers.filter(c => selectedCustomers.includes(c.id));
    sel.forEach((c, i) => {
      const msg = customMessage.replace(/{name}/g, c.name).replace(/{store}/g, storeConfig.storeName || 'Smart Grocery Mart');
      setTimeout(() => openWhatsApp(c.phone, msg), i * 1000);
    });
    setTimeout(() => { setSending(false); setCustomMessage(''); setSelectedCustomers([]); }, sel.length * 1000 + 500);
  }

  function saveSettings() { localStorage.setItem('alert_settings', JSON.stringify(alertSettings)); alert('Settings saved!'); }

  const lowStock = getLowStock(); const outOfStock = getOutOfStock(); const expiring = getExpiring(); const expired = getExpired(); const withBalance = getWithBalance();
  const totalAlerts = lowStock.length + outOfStock.length + expiring.length + expired.length + withBalance.length;

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <Bell className="text-orange-500"/>Alerts & Notifications
          {totalAlerts > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{totalAlerts}</span>}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Monitor stock, expiry, payments and send WhatsApp alerts</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-3 text-center">
          <Package size={20} className="text-yellow-600 mx-auto mb-1"/><p className="text-xl font-bold text-yellow-700">{lowStock.length}</p><p className="text-xs text-yellow-600">Low Stock</p></div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-3 text-center">
          <AlertTriangle size={20} className="text-red-600 mx-auto mb-1"/><p className="text-xl font-bold text-red-700">{outOfStock.length}</p><p className="text-xs text-red-600">Out of Stock</p></div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-3 text-center">
          <Clock size={20} className="text-orange-600 mx-auto mb-1"/><p className="text-xl font-bold text-orange-700">{expiring.length}</p><p className="text-xs text-orange-600">Expiring Soon</p></div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-3 text-center">
          <Calendar size={20} className="text-purple-600 mx-auto mb-1"/><p className="text-xl font-bold text-purple-700">{expired.length}</p><p className="text-xs text-purple-600">Expired</p></div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-3 text-center">
          <CreditCard size={20} className="text-blue-600 mx-auto mb-1"/><p className="text-xl font-bold text-blue-700">{withBalance.length}</p><p className="text-xs text-blue-600">Pending Payments</p></div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[{id:'dashboard',label:'All Alerts'},{id:'payment',label:'Payment Reminders'},{id:'custom',label:'Custom Message'},{id:'history',label:'Sent History'},{id:'settings',label:'Settings'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 dark:text-gray-300 border dark:border-gray-700'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {outOfStock.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h3 className="font-semibold dark:text-white mb-3 text-red-600 flex items-center gap-2"><AlertTriangle size={18}/>Out of Stock ({outOfStock.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {outOfStock.map(p => (<div key={p.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-lg"><span className="text-sm dark:text-white">{p.name}</span><span className="text-xs font-bold text-red-600">OUT OF STOCK</span></div>))}
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h3 className="font-semibold dark:text-white mb-3 text-yellow-600 flex items-center gap-2"><Package size={18}/>Low Stock ({lowStock.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {lowStock.map(p => (<div key={p.id} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg"><span className="text-sm dark:text-white">{p.name}</span><span className="text-xs font-bold text-yellow-600">{p.stock} left</span></div>))}
              </div>
            </div>
          )}
          {expired.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h3 className="font-semibold dark:text-white mb-3 text-purple-600 flex items-center gap-2"><Calendar size={18}/>Expired ({expired.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {expired.map(p => (<div key={p.id} className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg"><span className="text-sm dark:text-white">{p.name}</span><span className="text-xs font-bold text-purple-600">{new Date(p.expiry_date).toLocaleDateString()}</span></div>))}
              </div>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h3 className="font-semibold dark:text-white mb-3 text-orange-600 flex items-center gap-2"><Clock size={18}/>Expiring Soon ({expiring.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {expiring.map(p => (<div key={p.id} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg"><span className="text-sm dark:text-white">{p.name}</span><span className="text-xs font-bold text-orange-600">{new Date(p.expiry_date).toLocaleDateString()}</span></div>))}
              </div>
            </div>
          )}
          {withBalance.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h3 className="font-semibold dark:text-white mb-3 text-blue-600 flex items-center gap-2"><CreditCard size={18}/>Pending Payments ({withBalance.length})</h3>
              <div className="space-y-2">
                {withBalance.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <div><span className="text-sm font-medium dark:text-white">{c.name}</span><span className="text-xs text-gray-500 ml-2">{c.phone}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-600">Rs. {c.balance.toLocaleString()}</span>
                      <button onClick={() => sendReminder(c)} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 flex items-center gap-1"><MessageSquare size={12}/>Remind</button>
                    </div>
                  </div>
                ))}
                {withBalance.length > 1 && (
                  <button onClick={sendBulk} disabled={sending} className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Send size={16}/>{sending ? 'Sending...' : `Send All Reminders (${withBalance.length})`}</button>
                )}
              </div>
            </div>
          )}
          {totalAlerts === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-3"/><h3 className="font-semibold dark:text-white text-lg">All Clear!</h3><p className="text-gray-500 text-sm mt-1">No alerts. Everything is running smoothly.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">Payment Reminders via WhatsApp</h3>
            {withBalance.length > 1 && <button onClick={sendBulk} disabled={sending} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Send size={16}/>{sending ? 'Sending...' : 'Send All'}</button>}
          </div>
          {withBalance.length === 0 ? <p className="text-center text-gray-500 py-8">No pending payments!</p> :
            withBalance.sort((a,b) => b.balance - a.balance).map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 mb-2">
                <div><p className="font-medium dark:text-white">{c.name}</p><p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10}/>{c.phone}</p></div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-red-600">Rs. {c.balance.toLocaleString()}</p>
                  <button onClick={() => sendReminder(c)} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><MessageSquare size={14}/>Send</button>
                </div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h3 className="font-semibold dark:text-white mb-3">Compose Message</h3>
            <p className="text-xs text-gray-500 mb-2">Use {'{name}'} for customer name, {'{store}'} for store name</p>
            <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} rows={5} placeholder="Dear {name}, ..." className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3"/>
            <div className="flex gap-2 flex-wrap mb-3">
              {[{l:'New Arrival',m:'Dear {name},\n\nNew products at {store}! Visit us today.\n\nThank you!'},{l:'Special Offer',m:'Dear {name},\n\nSpecial discount at {store}! Up to 20% off.\n\nHurry!\n\nThank you!'},{l:'Festival Sale',m:'Dear {name},\n\nFestival sale LIVE at {store}! Amazing deals.\n\nVisit today!\n\nThank you!'}].map(t => (
                <button key={t.l} onClick={() => setCustomMessage(t.m)} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs dark:text-gray-300">{t.l}</button>
              ))}
            </div>
            <button onClick={sendCustom} disabled={sending || !customMessage || selectedCustomers.length === 0}
              className="w-full bg-green-600 text-white py-2 rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <Send size={16}/>{sending ? 'Sending...' : `Send to ${selectedCustomers.length} Customers`}</button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold dark:text-white">Select Customers</h3>
              <button onClick={() => setSelectedCustomers(selectedCustomers.length === customers.length ? [] : customers.map(c => c.id))} className="text-xs text-blue-600">
                {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}</button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {customers.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm">No customers</p> :
                customers.map(c => (
                  <label key={c.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedCustomers.includes(c.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <input type="checkbox" checked={selectedCustomers.includes(c.id)} onChange={() => setSelectedCustomers(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])} className="rounded"/>
                    <div><p className="text-sm font-medium dark:text-white">{c.name}</p><p className="text-xs text-gray-500">{c.phone}</p></div>
                  </label>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          {alertLogs.length === 0 ? <p className="text-center text-gray-500 py-8">No alerts sent yet</p> :
            alertLogs.map(log => (
              <div key={log.id} className="p-4 flex items-center justify-between border-b dark:border-gray-700 last:border-0">
                <div><div className="flex items-center gap-2"><MessageSquare size={14} className="text-green-600"/><span className="text-sm font-medium dark:text-white">{log.recipient}</span></div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{log.message}</p></div>
                <div className="text-right"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{log.status}</span>
                  <p className="text-xs text-gray-400 mt-1">{new Date(log.created_at).toLocaleString()}</p></div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 max-w-lg">
          <h3 className="font-semibold dark:text-white mb-4 flex items-center gap-2"><Settings size={18}/>Alert Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium dark:text-white">Low Stock Alerts</p></div>
              <button onClick={() => setAlertSettings({...alertSettings, lowStockAlert: !alertSettings.lowStockAlert})}
                className={`w-12 h-6 rounded-full ${alertSettings.lowStockAlert ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform ${alertSettings.lowStockAlert ? 'translate-x-6' : 'translate-x-0.5'}`}/></button>
            </div>
            {alertSettings.lowStockAlert && (
              <div><label className="text-xs text-gray-500">Threshold</label>
                <input type="number" value={alertSettings.lowStockThreshold} onChange={e => setAlertSettings({...alertSettings, lowStockThreshold: parseInt(e.target.value) || 0})}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
            )}
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium dark:text-white">Expiry Alerts</p></div>
              <button onClick={() => setAlertSettings({...alertSettings, expiryAlert: !alertSettings.expiryAlert})}
                className={`w-12 h-6 rounded-full ${alertSettings.expiryAlert ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform ${alertSettings.expiryAlert ? 'translate-x-6' : 'translate-x-0.5'}`}/></button>
            </div>
            {alertSettings.expiryAlert && (
              <div><label className="text-xs text-gray-500">Days Before Expiry</label>
                <input type="number" value={alertSettings.expiryDays} onChange={e => setAlertSettings({...alertSettings, expiryDays: parseInt(e.target.value) || 0})}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
            )}
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium dark:text-white">Payment Reminders</p></div>
              <button onClick={() => setAlertSettings({...alertSettings, paymentReminder: !alertSettings.paymentReminder})}
                className={`w-12 h-6 rounded-full ${alertSettings.paymentReminder ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform ${alertSettings.paymentReminder ? 'translate-x-6' : 'translate-x-0.5'}`}/></button>
            </div>
            <button onClick={saveSettings} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Save Settings</button>
          </div>
        </div>
      )}
    </div>
  );
}
