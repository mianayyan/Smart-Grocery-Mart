'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createWhatsAppLink } from '@/lib/utils';
import { t } from '@/i18n';
import { Customer } from '@/types';
import { toast } from 'sonner';
import { Send, MessageSquare, Users, Sparkles } from 'lucide-react';

export default function MarketingPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segment, setSegment] = useState('all');
  const [message, setMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers(data || []);
    setLoading(false);
  };

  const filteredCustomers = segment === 'all' ? customers : customers.filter(c => c.segment === segment);

  const quickTemplates = [
    { label: 'Festival Offer', emoji: '🎉', text: 'Assalam o Alaikum! 🎉\n\nSpecial festival offer at Smart Grocery Mart!\n\n🛒 Get 20% OFF on all items\n📅 Limited time offer\n\nVisit us today!\n\nSmart Grocery Mart' },
    { label: 'New Arrivals', emoji: '🆕', text: 'Assalam o Alaikum! 🆕\n\nNew products just arrived at Smart Grocery Mart!\n\n✨ Fresh stock available\n💰 Best prices guaranteed\n\nCome check them out!\n\nSmart Grocery Mart' },
    { label: 'Thank You', emoji: '🙏', text: 'Assalam o Alaikum! 🙏\n\nThank you for being a valued customer of Smart Grocery Mart!\n\n🎁 Special discount on your next visit\n💝 We appreciate your support\n\nSee you soon!\n\nSmart Grocery Mart' },
    { label: 'Ramadan Special', emoji: '🌙', text: 'Ramadan Mubarak! 🌙\n\nSpecial Ramadan offers at Smart Grocery Mart!\n\n🛒 Dates, juices, and more at special prices\n📦 Free delivery on orders above Rs. 2000\n\nSmart Grocery Mart' },
  ];

  const handleSendBulk = async () => {
    if (!message) { toast.error('Please write a message'); return; }
    if (filteredCustomers.length === 0) { toast.error('No customers in this segment'); return; }

    // Save campaign
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('campaigns').insert({
        user_id: user.id,
        name: campaignName || 'Quick Campaign',
        message_template: message,
        campaign_type: 'custom',
        target_segment: segment,
        status: 'sent',
        sent_count: filteredCustomers.length,
      });
    }

    // Open WhatsApp links
    filteredCustomers.forEach((customer, index) => {
      setTimeout(() => {
        const personalMessage = message.replace('{name}', customer.name);
        window.open(createWhatsAppLink(customer.phone, personalMessage), '_blank');
      }, index * 1500);
    });

    toast.success(`Sending to ${filteredCustomers.length} customers via WhatsApp!`);
  };

  const handleSendSingle = (customer: Customer) => {
    if (!message) { toast.error('Please write a message first'); return; }
    const personalMessage = message.replace('{name}', customer.name);
    window.open(createWhatsAppLink(customer.phone, personalMessage), '_blank');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">{t('marketing.title')}</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Message Builder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center gap-2">
            <MessageSquare size={20} /> Message Builder
          </h3>

          <input type="text" placeholder="Campaign Name (optional)" value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />

          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
            placeholder="Write your message here... Use {name} for customer name"
            className="w-full px-3 py-2 border rounded-lg mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />

          <p className="text-xs text-gray-500 mb-3">Tip: Use {'{name}'} to personalize with customer name</p>

          {/* Quick Templates */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 dark:text-gray-300">Quick Templates:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickTemplates.map((tmpl) => (
                <button key={tmpl.label} onClick={() => setMessage(tmpl.text)}
                  className="text-left p-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                  {tmpl.emoji} {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Segment Filter */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 dark:text-gray-300">Target Segment:</p>
            <div className="flex flex-wrap gap-2">
              {['all', 'regular', 'vip', 'wholesale', 'new'].map((s) => (
                <button key={s} onClick={() => setSegment(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize ${segment === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {s} ({s === 'all' ? customers.length : customers.filter(c => c.segment === s).length})
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSendBulk}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
            <Send size={20} /> Send to {filteredCustomers.length} Customers
          </button>
        </div>

        {/* Customer List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center gap-2">
            <Users size={20} /> Customers ({filteredCustomers.length})
          </h3>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : filteredCustomers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No customers found</p>
            ) : (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-sm dark:text-white">{customer.name}</p>
                    <p className="text-xs text-gray-500">{customer.phone}</p>
                  </div>
                  <button onClick={() => handleSendSingle(customer)}
                    className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Send size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
