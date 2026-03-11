'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isDevMode, enableDevMode, disableDevMode, DEV_ACCESS_KEY, APP_VERSION, getPlugins, savePlugins } from '@/lib/plugins';

export default function DevPanelPage() {
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('plugins');
  const [plugs, setPlugs] = useState(getPlugins());
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');

  useEffect(function() {
    if (isDevMode()) setAuth(true);
    try { setCss(localStorage.getItem('custom_css') || ''); setJs(localStorage.getItem('custom_js') || ''); } catch(e) {}
  }, []);

  function login() { if (key === DEV_ACCESS_KEY) { enableDevMode(); setAuth(true); setErr(''); } else setErr('Invalid key'); }
  function logout() { disableDevMode(); setAuth(false); router.push('/dashboard'); }
  function toggle(id: string) { const u = plugs.map(function(p) { return p.id === id ? {...p, enabled: !p.enabled} : p; }); setPlugs(u); savePlugins(u); }
  function clearD() { if(confirm('Clear all data?')){localStorage.clear();window.location.reload();} }
  function saveC() { localStorage.setItem('custom_css',css); localStorage.setItem('custom_js',js); alert('Saved!'); }

  if (!auth) {
    return (
      <div className='min-h-screen flex items-center justify-center p-4'>
        <div className='bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-8 w-full max-w-sm text-center'>
          <h2 className='text-xl font-bold dark:text-white mb-4'>Developer Access</h2>
          <input type='password' value={key} onChange={function(e: any){setKey(e.target.value);setErr('');}} onKeyDown={function(e: any){if(e.key==='Enter')login();}} placeholder='Access Key' className='w-full border rounded-lg px-4 py-3 mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center'/>
          {err && <p className='text-red-500 text-sm mb-3'>{err}</p>}
          <button onClick={login} className='w-full bg-gray-900 text-white py-3 rounded-lg'>Authenticate</button>
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 md:p-6 max-w-5xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold dark:text-white'>Developer Panel</h1>
          <p className='text-sm text-gray-500'>v{APP_VERSION}</p>
        </div>
        <button onClick={logout} className='bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm'>Exit Dev Mode</button>
      </div>

      <div className='flex gap-2 mb-4'>
        {['plugins','system','tools','deploy'].map(function(t) {
          return <button key={t} onClick={function(){setTab(t);}} className={'px-4 py-2 rounded-lg text-sm capitalize ' + (tab===t ? 'bg-gray-900 text-green-400' : 'bg-white dark:bg-gray-800 dark:text-gray-300 border dark:border-gray-700')}>{t}</button>;
        })}
      </div>

      {tab === 'plugins' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4'>
          <h3 className='font-semibold dark:text-white mb-3'>Plugins</h3>
          <div className='space-y-2'>
            {plugs.map(function(p) {
              return (
                <div key={p.id} className='flex items-center justify-between p-3 rounded-lg border dark:border-gray-700'>
                  <div><p className='font-medium dark:text-white text-sm'>{p.name}</p><p className='text-xs text-gray-500'>{p.description}</p></div>
                  <button onClick={function(){toggle(p.id);}} className={'w-12 h-6 rounded-full ' + (p.enabled ? 'bg-green-500' : 'bg-gray-300')}>
                    <div className={'w-5 h-5 bg-white rounded-full shadow transform ' + (p.enabled ? 'translate-x-6' : 'translate-x-0.5')}/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className='space-y-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4'>
            <h3 className='font-semibold dark:text-white mb-3'>System Info</h3>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'><p className='text-gray-500'>Framework</p><p className='font-medium dark:text-white'>Next.js 14</p></div>
              <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'><p className='text-gray-500'>Database</p><p className='font-medium dark:text-white'>Supabase</p></div>
              <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'><p className='text-gray-500'>Hosting</p><p className='font-medium dark:text-white'>Vercel</p></div>
              <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'><p className='text-gray-500'>Auth</p><p className='font-medium dark:text-white'>Supabase Auth</p></div>
            </div>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4'>
            <h3 className='font-semibold text-red-600 mb-3'>Danger Zone</h3>
            <button onClick={clearD} className='bg-red-600 text-white px-4 py-2 rounded-lg text-sm'>Clear All Data</button>
          </div>
        </div>
      )}

      {tab === 'tools' && (
        <div className='space-y-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4'>
            <h3 className='font-semibold dark:text-white mb-3'>Custom CSS</h3>
            <textarea value={css} onChange={function(e: any){setCss(e.target.value);}} rows={4} className='w-full border rounded-lg px-3 py-2 font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white'/>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4'>
            <h3 className='font-semibold dark:text-white mb-3'>Custom JS</h3>
            <textarea value={js} onChange={function(e: any){setJs(e.target.value);}} rows={4} className='w-full border rounded-lg px-3 py-2 font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white'/>
          </div>
          <button onClick={saveC} className='bg-blue-600 text-white px-6 py-2 rounded-lg'>Save</button>
        </div>
      )}

      {tab === 'deploy' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4'>
          <h3 className='font-semibold dark:text-white mb-3'>Deployment</h3>
          <div className='space-y-3 text-sm'>
            <div className='p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'><p className='font-medium text-green-700'>Auto Deploy: ON</p></div>
            <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'><p className='text-gray-500'>GitHub</p><p className='text-blue-600'>mianayyan/Smart-Grocery-Mart</p></div>
            <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'><p className='text-gray-500'>Live</p><p className='text-blue-600'>smart-grocery-mart.vercel.app</p></div>
          </div>
        </div>
      )}
    </div>
  );
}