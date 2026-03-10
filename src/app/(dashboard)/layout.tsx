'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useFestivalStore } from '@/store/festival';
import { useStoreConfig } from '@/store/storeConfig';
import { isDevMode, APP_VERSION } from '@/lib/plugins';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Megaphone, Truck, Settings, LogOut, Menu, X, CreditCard,
  Receipt, Camera, Moon, Sun, Sparkles, Terminal, UserCog, Award,
  FileText, Bell
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS / Sale', href: '/pos', icon: ShoppingCart },
  { name: 'Scanner', href: '/scanner', icon: Camera },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Loyalty Program', href: '/loyalty', icon: Award },
  { name: 'Credit Book', href: '/khata', icon: CreditCard },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Employees', href: '/employees', icon: UserCog },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const { currentFestival, festivalEnabled, theme, darkMode, toggleDarkMode, toggleFestival } = useFestivalStore();
  const storeConfig = useStoreConfig();

  useEffect(() => {
    setDevMode(isDevMode());
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      storeConfig.loadConfig();
    }
    getUser();
  }, []);

  useEffect(() => {
    const handleDevMode = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        router.push('/dev-panel');
      }
    };
    window.addEventListener('keydown', handleDevMode);
    return () => window.removeEventListener('keydown', handleDevMode);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const allNavItems = devMode
    ? [...navItems, { name: 'Dev Panel', href: '/dev-panel', icon: Terminal }]
    : navItems;

  function getNavClass(href: string, isActive: boolean) {
    if (isActive) {
      if (currentFestival && festivalEnabled && theme) return `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`;
      if (href === '/dev-panel') return 'bg-gray-900 text-green-400 shadow-lg';
      return 'bg-blue-600 text-white shadow-lg shadow-blue-200';
    }
    if (href === '/dev-panel') return darkMode ? 'text-green-400 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100';
    return darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}/>}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col`}>

        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentFestival && festivalEnabled && theme ? (
                <span className="text-2xl">{theme.emoji}</span>
              ) : (
                <span className="text-2xl">🛒</span>
              )}
              <div>
                <h1 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{storeConfig.storeName}</h1>
                <p className="text-xs text-gray-500">Smart Grocery Mart</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><X size={20} className={darkMode ? 'text-white' : 'text-gray-900'}/></button>
          </div>
          {currentFestival && festivalEnabled && theme && (
            <div className={`mt-2 px-2 py-1 rounded-lg text-xs text-center bg-gradient-to-r ${theme.gradient} text-white`}>
              {theme.emoji} {theme.name} Mubarak! {theme.emoji}
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allNavItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${getNavClass(item.href, isActive)}`}>
                <item.icon size={18}/>
                {item.name}
                {item.href === '/dev-panel' && <span className="ml-auto text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">DEV</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} space-y-1`}>
          <button onClick={toggleDarkMode}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          {currentFestival && (
            <button onClick={toggleFestival}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Sparkles size={18}/>
              {festivalEnabled ? 'Disable' : 'Enable'} Festival
            </button>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut size={18}/>Logout
          </button>
        </div>

        <div className={`px-4 py-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className="text-[10px] text-gray-400 text-center">Developed by <span className="font-semibold text-blue-500">Mian Fahad</span></p>
          <p className="text-[10px] text-gray-400 text-center">v{APP_VERSION}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <header className={`sticky top-0 z-30 px-4 py-3 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} lg:hidden flex items-center justify-between`}>
          <button onClick={() => setSidebarOpen(true)}><Menu size={24} className={darkMode ? 'text-white' : 'text-gray-900'}/></button>
          <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{storeConfig.storeName}</span>
          <button onClick={() => router.push('/dev-panel')} className="opacity-0 w-8 h-8 active:opacity-100" aria-label="dev">
            <Terminal size={14}/>
          </button>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
