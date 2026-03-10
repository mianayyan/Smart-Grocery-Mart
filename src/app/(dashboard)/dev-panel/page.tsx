'use client';

import { useState, useEffect } from 'react';
import { enableDevMode, disableDevMode, isDevMode, getPlugins, savePlugins, Plugin, APP_VERSION, DEV_ACCESS_KEY } from '@/lib/plugins';
import { toast } from 'sonner';
import { Shield, ShieldOff, Puzzle, RefreshCw, Terminal, Globe, GitBranch, Cpu, Database, ToggleLeft, ToggleRight, Lock, Unlock, Settings, Zap, Code, Eye, EyeOff, Rocket } from 'lucide-react';

export default function DevPanelPage() {
  const [devMode, setDevMode] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [showSystem, setShowSystem] = useState(false);
  const [customCSS, setCustomCSS] = useState('');
  const [customJS, setCustomJS] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'plugins' | 'system' | 'tools' | 'deploy'>('plugins');

  useEffect(() => {
    setDevMode(isDevMode());
    setPlugins(getPlugins());
    setCustomCSS(localStorage.getItem('custom_css') || '');
    setCustomJS(localStorage.getItem('custom_js') || '');
  }, []);

  function handleLogin() {
    if (enableDevMode(accessKey)) {
      setDevMode(true);
      toast.success('Developer Mode Activated!');
    } else {
      toast.error('Invalid access key!');
    }
  }

  function handleLogout() {
    disableDevMode();
    setDevMode(false);
    toast.success('Developer Mode Deactivated');
  }

  function togglePlugin(pluginId: string) {
    const updated = plugins.map(p => p.id === pluginId ? { ...p, enabled: !p.enabled } : p);
    setPlugins(updated);
    savePlugins(updated);
    const plugin = updated.find(p => p.id === pluginId);
    toast.success(`${plugin?.name} ${plugin?.enabled ? 'enabled' : 'disabled'}`);
  }

  function saveCustomCode() {
    localStorage.setItem('custom_css', customCSS);
    localStorage.setItem('custom_js', customJS);
    toast.success('Custom code saved! Refresh to apply.');
  }

  function resetPlugins() {
    if (!confirm('Reset all plugins to default?')) return;
    localStorage.removeItem('app_plugins');
    setPlugins(getPlugins());
    toast.success('Plugins reset to default');
  }

  function clearAllData() {
    if (!confirm('WARNING: This will clear all local settings. Are you sure?')) return;
    localStorage.clear();
    toast.success('All local data cleared. Refreshing...');
    setTimeout(() => window.location.reload(), 1000);
  }

  const categoryColors: Record<string, string> = {
    pos: '#3B82F6', inventory: '#10B981', customers: '#8B5CF6',
    analytics: '#F59E0B', marketing: '#EC4899', system: '#EF4444', ui: '#06B6D4'
  };

  const categoryIcons: Record<string, string> = {
    pos: '🛒', inventory: '📦', customers: '👥',
    analytics: '📊', marketing: '📣', system: '⚙️', ui: '🎨'
  };

  if (!devMode) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center border dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-green-400" size={32}/>
          </div>
          <h1 className="text-2xl font-bold dark:text-white mb-2">Developer Access</h1>
          <p className="text-gray-500 mb-6">Enter developer access key to continue</p>
          <input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter access key..."
            className="w-full border rounded-lg px-4 py-3 mb-4 text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          <button onClick={handleLogin} className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 flex items-center justify-center gap-2">
            <Unlock size={18}/>Access Developer Panel
          </button>
          <p className="text-xs text-gray-400 mt-4">v{APP_VERSION} | Authorized personnel only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center"><Terminal className="text-green-400" size={20}/></div>
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Developer Panel</h1>
            <p className="text-gray-500 text-sm">v{APP_VERSION} | Smart Grocery Mart</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 text-sm">
            <ShieldOff size={16}/>Exit Dev Mode</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2"><Cpu size={18} className="text-green-600"/><p className="text-green-600 text-sm font-medium">App Version</p></div>
          <p className="text-xl font-bold text-green-700 mt-1">v{APP_VERSION}</p></div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2"><Puzzle size={18} className="text-blue-600"/><p className="text-blue-600 text-sm font-medium">Active Plugins</p></div>
          <p className="text-xl font-bold text-blue-700 mt-1">{plugins.filter(p => p.enabled).length}/{plugins.length}</p></div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2"><Globe size={18} className="text-purple-600"/><p className="text-purple-600 text-sm font-medium">Platform</p></div>
          <p className="text-xl font-bold text-purple-700 mt-1">Vercel</p></div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2"><Database size={18} className="text-orange-600"/><p className="text-orange-600 text-sm font-medium">Database</p></div>
          <p className="text-xl font-bold text-orange-700 mt-1">Supabase</p></div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['plugins', 'system', 'tools', 'deploy'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border dark:border-gray-700'}`}>
            {tab === 'plugins' && <Puzzle size={16} className="inline mr-1"/>}
            {tab === 'system' && <Settings size={16} className="inline mr-1"/>}
            {tab === 'tools' && <Code size={16} className="inline mr-1"/>}
            {tab === 'deploy' && <Rocket size={16} className="inline mr-1"/>}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'plugins' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Plugin Manager</h2>
            <button onClick={resetPlugins} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1"><RefreshCw size={14}/>Reset All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plugins.map(plugin => (
              <div key={plugin.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${plugin.enabled ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700 opacity-70'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryIcons[plugin.category]}</span>
                    <div><p className="font-semibold text-sm dark:text-white">{plugin.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: categoryColors[plugin.category] + '20', color: categoryColors[plugin.category] }}>{plugin.category}</span></div>
                  </div>
                  <button onClick={() => togglePlugin(plugin.id)} className={`p-1 rounded-lg ${plugin.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {plugin.enabled ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">{plugin.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">v{plugin.version}</span>
                  <span className={`text-xs font-medium ${plugin.enabled ? 'text-green-600' : 'text-gray-400'}`}>{plugin.enabled ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h3 className="font-semibold dark:text-white mb-3">System Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">Framework</p><p className="font-medium dark:text-white">Next.js 14</p></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">Database</p><p className="font-medium dark:text-white">Supabase (PostgreSQL)</p></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">Hosting</p><p className="font-medium dark:text-white">Vercel</p></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">State Management</p><p className="font-medium dark:text-white">Zustand</p></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">Styling</p><p className="font-medium dark:text-white">Tailwind CSS</p></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">Auth</p><p className="font-medium dark:text-white">Supabase Auth</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h3 className="font-semibold dark:text-white mb-3 text-red-600">Danger Zone</h3>
            <button onClick={clearAllData} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">Clear All Local Data</button>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h3 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><Code size={18}/>Custom CSS</h3>
            <textarea value={customCSS} onChange={e => setCustomCSS(e.target.value)} rows={6}
              placeholder="/* Add custom CSS here */" className="w-full border rounded-lg px-3 py-2 font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h3 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><Terminal size={18}/>Custom JavaScript</h3>
            <textarea value={customJS} onChange={e => setCustomJS(e.target.value)} rows={6}
              placeholder="// Add custom JS here" className="w-full border rounded-lg px-3 py-2 font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>
          <button onClick={saveCustomCode} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Save Custom Code</button>
        </div>
      )}

      {activeTab === 'deploy' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <h3 className="font-semibold dark:text-white mb-3 flex items-center gap-2"><Rocket size={18}/>Deployment Info</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-medium text-green-700">Auto Deploy: ENABLED</p>
                <p className="text-green-600 text-xs mt-1">Every git push to main branch auto-deploys to Vercel</p></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">GitHub Repo</p>
                <a href="https://github.com/mianayyan/Smart-Grocery-Mart" target="_blank" className="font-medium text-blue-600 hover:underline">mianayyan/Smart-Grocery-Mart</a></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">Live URL</p>
                <a href="https://smart-grocery-mart.vercel.app" target="_blank" className="font-medium text-blue-600 hover:underline">smart-grocery-mart.vercel.app</a></div>
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg"><p className="text-gray-500">How to Update</p>
                <p className="font-medium dark:text-white">Terminal: git add . → git commit -m "msg" → git push</p>
                <p className="text-xs text-gray-500 mt-1">Vercel will auto-build and deploy in 1-2 minutes</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
