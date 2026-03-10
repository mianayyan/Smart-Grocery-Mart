'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStoreConfig } from '@/store/storeConfig';
import { Customer } from '@/types';
import { toast } from 'sonner';
import { Send, MessageSquare, Users, Filter, Sparkles, Phone } from 'lucide-react';

export default function MarketingPage() {
  const supabase = createClient();
  const storeConfig = useStoreConfig();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [message, setMessage] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  useEffect(() => {
    storeConfig.loadConfig();
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('customers').select('*').eq('user_id', user.id).order('name');
    setCustomers(data || []);
    setLoading(false);
  }

  const quickTemplates = [
    {
      name: 'Welcome Offer',
      message: `Welcome to ${storeConfig.storeName}! Get 10% off on your first purchase. Visit us today! ${storeConfig.storePhone ? 'Call: ' + storeConfig.storePhone : ''}`
    },
    {
      name: 'Weekend Sale',
      message: `Weekend Special at ${storeConfig.storeName}! Enjoy amazing discounts on all products this weekend. Don't miss out! ${storeConfig.storeAddress ? 'Visit: ' + storeConfig.storeAddress : ''}`
    },
    {
      name: 'New Arrivals',
      message: `New products just arrived at ${storeConfig.storeName}! Come check out our latest collection of fresh groceries and daily essentials.`
    },
    {
      name: 'Festival Offer',
      message: `Festival Special from ${storeConfig.storeName}! Celebrate with us and enjoy special discounts on all items. Wishing you a happy season!`
    },
    {
      name: 'Payment Reminder',
      message: `Dear Customer, this is a friendly reminder from ${storeConfig.storeName} regarding your pending balance. Please visit us to settle your account. Thank you!`
    },
    {
      name: 'Loyalty Thanks',
      message: `Thank you for being a valued customer of ${storeConfig.storeName}! As a token of our appreciation, enjoy a special discount on your next visit.`
    },
  ];

  function sendWhatsApp(phone: string, msg: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function sendToSelected() {
    if (!message) { toast.error('Please enter a message'); return; }
    if (selectedCustomers.length === 0) { toast.error('Please select at least one customer'); return; }
    selectedCustomers.forEach(id => {
      const customer = customers.find(c => c.id === id);
      if (customer?.phone) {
        sendWhatsApp(customer.phone, message);
      }
    });
    toast.success(`Sending to ${selectedCustomers.length} customers via WhatsApp`);
  }

  function toggleCustomer(id: string) {
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function selectAll() {
    const filtered = getFilteredCustomers();
    if (selectedCustomers.length === filtered.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filtered.map(c => c.id));
    }
  }

  function getFilteredCustomers() {
    if (selectedSegment === 'all') return customers;
    return customers.filter(c => c.segment === selectedSegment);
  }

  const filteredCustomers = getFilteredCustomers();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing</h1>
        <p className="text-gray-500">Send promotional messages to customers via WhatsApp</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h2 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><Sparkles size={18}/>Quick Templates</h2>
            <p className="text-xs text-blue-600 mb-3">Templates automatically use your store name: <strong>{storeConfig.storeName}</strong></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {quickTemplates.map(t => (
                <button key={t.name} onClick={() => setMessage(t.message)}
                  className="p-3 border dark:border-gray-700 rounded-lg text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <p className="font-medium text-sm dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.message}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h2 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><MessageSquare size={18}/>Message</h2>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="Type your marketing message here..."
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">{message.length} characters</span>
              <button onClick={sendToSelected}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
                <Send size={16}/>Send to Selected ({selectedCustomers.length})
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold dark:text-white flex items-center gap-2"><Users size={18}/>Customers</h2>
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">
              {selectedCustomers.length === filteredCustomers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="mb-3">
            <select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="all">All Customers ({customers.length})</option>
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
              <option value="wholesale">Wholesale</option>
              <option value="new">New</option>
            </select>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No customers found</p>
            ) : (
              filteredCustomers.map(c => (
                <div key={c.id} onClick={() => toggleCustomer(c.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedCustomers.includes(c.id) ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}`}>
                  <input type="checkbox" checked={selectedCustomers.includes(c.id)} readOnly className="rounded"/>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10}/>{c.phone}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.segment === 'vip' ? 'bg-purple-100 text-purple-700' : c.segment === 'wholesale' ? 'bg-blue-100 text-blue-700' : c.segment === 'new' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {c.segment}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
