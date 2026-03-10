'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isDevMode, enableDevMode, disableDevMode, DEV_ACCESS_KEY, APP_VERSION, getPlugins, savePlugins } from '@/lib/plugins';
import { Shield, Lock, Terminal, Puzzle, Info, Code, Rocket, Power, Trash2 } from 'lucide-react';

export default function DevPanelPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('plugins');
  const [plugins, setPlugins] = useState(getPlugins());
  const [customCSS, setCustomCSS] = useState('');
  const [customJS, setCustomJS] = useState('');

  useEffect(() => {
    if (isDevMode()) setAuthenticated(true);
    try {
      setCustomCSS(localStorage.getItem('custom_css') || '');
      setCustomJS(localStorage.getItem('custom_js') || '');
    } catch(e) {}
  }, []);

  function handleLogin() {
    if (key === DEV_ACCESS_KEY) {
      enableDevMode();
      setAuthenticated(true);
      setError('');
    } else {
      setError('Invalid access key');
    }
  }

  function handleLogout() {
    disableDevMode();
    setAuthenticated(false);
    setKey('');
    router.push('/dashboard');
  }

  function togglePlugin(id: string) {
    const updated = plugins.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    setPlugins(updated);
    savePlugins(updated);
  }

  function clearAllData() {
    if (confirm('Clear ALL local data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  function saveCustomCode() {
    localStorage.setItem('custom_css', customCSS);
    localStorage.setItem('custom_js', customJS);
    alert('Custom code saved!');
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 w-full max-w-sm text-center">
          <Lock size={48} className="text-gray-400 mx-auto mb-4"/>
          <h2 className="text-xl font-bold dark:text-white mb-2">Developer Access</h2>
          <p className="text-sm text-gray-500 mb-4">Enter your developer access key</p>
          <input type="password" value={key} onChange={e => { setKey(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Access Key" className="w-full border rounded-lg px-4 py-3 mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"/>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button onClick={handleLogin} className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800">
            <Shield className="inline mr-2" size={16}/>Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Terminal className="text-green-500"/>Developer Panel</h1>
          <p className="text-sm text-gray-500">v{APP_VERSION} • Dev Mode Active</p>
        </div>
        <button onClick={handleLogout} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-200 flex items-center gap-2">
          <Power size={16}/>Exit Dev Mode
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['plugins', 'system', 'tools', 'deploy'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'bg-gray-900 text-green-400' : 'bg-white dark:bg-gray-800 dark:text-gray-300 border dark:border-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'plugins' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <h3 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><Puzzle size={18}/>Plugins</h3>
          <div className="space-y-2">
            {plugins.map(plugin => (
              <div key={plugin.id} className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700">
                <div>
                  <p className="font-medium dark:text-white text-sm">{plugin.name}</p>
                  <p className="text-xs text-gray-500">{plugin.description} • v{plugin.version}</p>
                </div>
                <button onClick={() => togglePlugin(plugin.id)}
                  className={`w-12 h-6 rounded-full transition-colors ${plugin.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${plugin.enabled ? 'translate-x-6' : 'translate-x-0.5'}`}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h3 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><Info size={18}/>System Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Framework','Next.js 14'],['Database','Supabase'],['Hosting','Vercel'],
git add .
git commit -m "Fixed POS, Auto WhatsApp Bill, Dev Panel security, Loyalty, Reports, Alerts"
git push

npm run dev

