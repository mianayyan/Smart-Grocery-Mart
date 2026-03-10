'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Award, Star, Gift, TrendingUp, Users, Settings, Search, Plus, Minus, Crown, ChevronDown, ChevronUp } from 'lucide-react';

interface Customer {
  id: string; name: string; phone: string; total_points: number; points_redeemed: number; loyalty_tier: string;
}
interface PointEntry {
  id: string; customer_id: string; points: number; type: string; description: string; created_at: string;
}
interface LoyaltySettings {
  points_per_rupee: number; redemption_value: number; min_redeem_points: number;
  bronze_min: number; silver_min: number; gold_min: number; platinum_min: number;
}

const TIERS = [
  { id: 'bronze', name: 'Bronze', color: '#CD7F32', icon: '🥉', min: 0 },
  { id: 'silver', name: 'Silver', color: '#C0C0C0', icon: '🥈', min: 500 },
  { id: 'gold', name: 'Gold', color: '#FFD700', icon: '🥇', min: 2000 },
  { id: 'platinum', name: 'Platinum', color: '#E5E4E2', icon: '👑', min: 5000 },
];

export default function LoyaltyPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [history, setHistory] = useState<PointEntry[]>([]);
  const [settings, setSettings] = useState<LoyaltySettings>({
    points_per_rupee: 1, redemption_value: 0.5, min_redeem_points: 100,
    bronze_min: 0, silver_min: 500, gold_min: 2000, platinum_min: 5000
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [showRedeemPoints, setShowRedeemPoints] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsDesc, setPointsDesc] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: custs } = await supabase.from('customers').select('*').eq('user_id', user.id).order('total_points', { ascending: false });
    setCustomers(custs || []);

    const { data: pts } = await supabase.from('loyalty_points').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setHistory(pts || []);

    const { data: sett } = await supabase.from('loyalty_settings').select('*').eq('user_id', user.id).single();
    if (sett) setSettings(sett);

    setLoading(false);
  }

  function getTier(points: number) {
    if (points >= settings.platinum_min) return TIERS[3];
    if (points >= settings.gold_min) return TIERS[2];
    if (points >= settings.silver_min) return TIERS[1];
    return TIERS[0];
  }

  function getNextTier(points: number) {
    if (points >= settings.platinum_min) return null;
    if (points >= settings.gold_min) return { ...TIERS[3], remaining: settings.platinum_min - points };
    if (points >= settings.silver_min) return { ...TIERS[2], remaining: settings.gold_min - points };
    return { ...TIERS[1], remaining: settings.silver_min - points };
  }

  async function addPoints() {
    if (!selectedCustomer || !pointsAmount) return;
    const pts = parseInt(pointsAmount);
    if (pts <= 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('loyalty_points').insert({
      user_id: user.id, customer_id: selectedCustomer.id, points: pts,
      type: 'bonus', description: pointsDesc || 'Bonus points added'
    });

    const newTotal = (selectedCustomer.total_points || 0) + pts;
    const newTier = getTier(newTotal);
    await supabase.from('customers').update({ total_points: newTotal, loyalty_tier: newTier.id }).eq('id', selectedCustomer.id);

    setShowAddPoints(false); setPointsAmount(''); setPointsDesc('');
    setSelectedCustomer(null); loadData();
  }

  async function redeemPoints() {
    if (!selectedCustomer || !pointsAmount) return;
    const pts = parseInt(pointsAmount);
    if (pts <= 0 || pts > (selectedCustomer.total_points || 0)) return;
    if (pts < settings.min_redeem_points) { alert(`Minimum ${settings.min_redeem_points} points required to redeem`); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('loyalty_points').insert({
      user_id: user.id, customer_id: selectedCustomer.id, points: pts,
      type: 'redeemed', description: pointsDesc || `Redeemed ${pts} points (Rs. ${(pts * settings.redemption_value).toFixed(0)} discount)`
    });

    const newTotal = (selectedCustomer.total_points || 0) - pts;
    const newRedeemed = (selectedCustomer.points_redeemed || 0) + pts;
    const newTier = getTier(newTotal);
    await supabase.from('customers').update({ total_points: newTotal, points_redeemed: newRedeemed, loyalty_tier: newTier.id }).eq('id', selectedCustomer.id);

    setShowRedeemPoints(false); setPointsAmount(''); setPointsDesc('');
    setSelectedCustomer(null); loadData();
  }

  async function saveSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase.from('loyalty_settings').select('id').eq('user_id', user.id).single();
    if (existing) {
      await supabase.from('loyalty_settings').update(settings).eq('id', existing.id);
    } else {
      await supabase.from('loyalty_settings').insert({ ...settings, user_id: user.id });
    }
    setShowSettings(false);
  }

  const totalPoints = customers.reduce((sum, c) => sum + (c.total_points || 0), 0);
  const totalRedeemed = customers.reduce((sum, c) => sum + (c.points_redeemed || 0), 0);
  const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  const tierCounts = {
    bronze: customers.filter(c => getTier(c.total_points || 0).id === 'bronze').length,
    silver: customers.filter(c => getTier(c.total_points || 0).id === 'silver').length,
    gold: customers.filter(c => getTier(c.total_points || 0).id === 'gold').length,
    platinum: customers.filter(c => getTier(c.total_points || 0).id === 'platinum').length,
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Award className="text-yellow-500"/>Loyalty Program</h1>
          <p className="text-gray-500 text-sm mt-1">Reward your customers and build lasting relationships</p>
        </div>
        <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg text-sm dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700">
          <Settings size={16}/>Program Settings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-1"><Star size={18}/><span className="text-sm">Total Points</span></div>
          <p className="text-2xl font-bold dark:text-white">{totalPoints.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1"><Gift size={18}/><span className="text-sm">Redeemed</span></div>
          <p className="text-2xl font-bold dark:text-white">{totalRedeemed.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1"><Users size={18}/><span className="text-sm">Members</span></div>
          <p className="text-2xl font-bold dark:text-white">{customers.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1"><TrendingUp size={18}/><span className="text-sm">Avg Points</span></div>
          <p className="text-2xl font-bold dark:text-white">{customers.length > 0 ? Math.round(totalPoints / customers.length) : 0}</p>
        </div>
      </div>

      {/* Tier Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {TIERS.map(tier => (
          <div key={tier.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 text-center">
            <span className="text-2xl">{tier.icon}</span>
            <p className="font-semibold dark:text-white text-sm mt-1">{tier.name}</p>
            <p className="text-2xl font-bold dark:text-white">{tierCounts[tier.id as keyof typeof tierCounts]}</p>
            <p className="text-xs text-gray-500">customers</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['overview', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 dark:text-gray-300 border dark:border-gray-700'}`}>
            {tab === 'overview' ? 'Customers' : 'Points History'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
            </div>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No customers found. Add customers first from the Customers page.</p>
            ) : (
              filteredCustomers.map(customer => {
                const tier = getTier(customer.total_points || 0);
                const nextTier = getNextTier(customer.total_points || 0);
                return (
                  <div key={customer.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: tier.color + '30' }}>
                          {tier.icon}
                        </div>
                        <div>
                          <p className="font-medium dark:text-white">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.phone} • {tier.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-3">
                          <p className="font-bold dark:text-white">{(customer.total_points || 0).toLocaleString()} pts</p>
                          {nextTier && <p className="text-xs text-gray-500">{nextTier.remaining} to {nextTier.name}</p>}
                        </div>
                        <button onClick={() => { setSelectedCustomer(customer); setShowAddPoints(true); }}
                          className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200" title="Add Points"><Plus size={16}/></button>
                        <button onClick={() => { setSelectedCustomer(customer); setShowRedeemPoints(true); }}
                          className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200" title="Redeem Points"
                          disabled={(customer.total_points || 0) < settings.min_redeem_points}><Gift size={16}/></button>
                      </div>
                    </div>
                    {nextTier && (
                      <div className="mt-2 ml-13">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{
                            backgroundColor: tier.color,
                            width: `${Math.min(100, ((customer.total_points || 0) / (nextTier.remaining + (customer.total_points || 0))) * 100)}%`
                          }}/>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <div className="divide-y dark:divide-gray-700">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No points history yet</p>
            ) : (
              history.map(entry => {
                const customer = customers.find(c => c.id === entry.customer_id);
                return (
                  <div key={entry.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-white">{customer?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{entry.description}</p>
                      <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}</p>
                    </div>
                    <span className={`font-bold ${entry.type === 'earned' || entry.type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'earned' || entry.type === 'bonus' ? '+' : '-'}{entry.points} pts
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Points Modal */}
      {showAddPoints && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg dark:text-white mb-1">Add Points</h3>
            <p className="text-sm text-gray-500 mb-4">Customer: {selectedCustomer.name} (Current: {selectedCustomer.total_points || 0} pts)</p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Points to Add</label>
                <input type="number" value={pointsAmount} onChange={e => setPointsAmount(e.target.value)} placeholder="e.g. 100"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Reason (Optional)</label>
                <input value={pointsDesc} onChange={e => setPointsDesc(e.target.value)} placeholder="e.g. Birthday bonus"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddPoints(false); setPointsAmount(''); setPointsDesc(''); }} className="flex-1 border rounded-lg py-2 dark:border-gray-600 dark:text-white">Cancel</button>
                <button onClick={addPoints} className="flex-1 bg-green-600 text-white rounded-lg py-2 hover:bg-green-700">Add Points</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Points Modal */}
      {showRedeemPoints && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg dark:text-white mb-1">Redeem Points</h3>
            <p className="text-sm text-gray-500 mb-2">Customer: {selectedCustomer.name} (Available: {selectedCustomer.total_points || 0} pts)</p>
            <p className="text-xs text-blue-600 mb-4">1 point = Rs. {settings.redemption_value} discount • Min: {settings.min_redeem_points} pts</p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Points to Redeem</label>
                <input type="number" value={pointsAmount} onChange={e => setPointsAmount(e.target.value)} placeholder={`Max: ${selectedCustomer.total_points || 0}`}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                {pointsAmount && <p className="text-sm text-green-600 mt-1">Discount: Rs. {(parseInt(pointsAmount) * settings.redemption_value).toFixed(0)}</p>}
              </div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Note (Optional)</label>
                <input value={pointsDesc} onChange={e => setPointsDesc(e.target.value)} placeholder="e.g. Discount on purchase"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowRedeemPoints(false); setPointsAmount(''); setPointsDesc(''); }} className="flex-1 border rounded-lg py-2 dark:border-gray-600 dark:text-white">Cancel</button>
                <button onClick={redeemPoints} className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700">Redeem Points</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Settings size={18}/>Loyalty Program Settings</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Points per Rs. 1 spent</label>
                <input type="number" value={settings.points_per_rupee} onChange={e => setSettings({ ...settings, points_per_rupee: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Redemption Value (Rs. per point)</label>
                <input type="number" step="0.1" value={settings.redemption_value} onChange={e => setSettings({ ...settings, redemption_value: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Minimum Points to Redeem</label>
                <input type="number" value={settings.min_redeem_points} onChange={e => setSettings({ ...settings, min_redeem_points: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              <hr className="dark:border-gray-700"/>
              <p className="text-sm font-medium dark:text-gray-300">Tier Thresholds (points)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs mb-1 dark:text-gray-400">🥈 Silver</label>
                  <input type="number" value={settings.silver_min} onChange={e => setSettings({ ...settings, silver_min: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-xs mb-1 dark:text-gray-400">🥇 Gold</label>
                  <input type="number" value={settings.gold_min} onChange={e => setSettings({ ...settings, gold_min: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-xs mb-1 dark:text-gray-400">👑 Platinum</label>
                  <input type="number" value={settings.platinum_min} onChange={e => setSettings({ ...settings, platinum_min: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSettings(false)} className="flex-1 border rounded-lg py-2 dark:border-gray-600 dark:text-white">Cancel</button>
                <button onClick={saveSettings} className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700">Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
