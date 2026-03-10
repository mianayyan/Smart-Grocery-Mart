export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  category: 'pos' | 'inventory' | 'customers' | 'analytics' | 'marketing' | 'system' | 'ui';
  component?: string;
  settings?: Record<string, any>;
}

export const DEFAULT_PLUGINS: Plugin[] = [
  { id: 'barcode-scanner', name: 'Barcode Scanner', description: 'Scan products using camera', version: '1.0.0', enabled: true, category: 'pos' },
  { id: 'khata-system', name: 'Khata / Credit Book', description: 'Customer credit and payment tracking', version: '1.0.0', enabled: true, category: 'customers' },
  { id: 'expense-tracker', name: 'Expense Tracker', description: 'Track store expenses', version: '1.0.0', enabled: true, category: 'analytics' },
  { id: 'festival-themes', name: 'Festival Themes', description: 'Auto festival decorations', version: '1.0.0', enabled: true, category: 'ui' },
  { id: 'whatsapp-integration', name: 'WhatsApp Integration', description: 'Send bills and reminders via WhatsApp', version: '1.0.0', enabled: true, category: 'marketing' },
  { id: 'receipt-printer', name: 'Receipt Printer', description: 'Print sale receipts', version: '1.0.0', enabled: true, category: 'pos' },
  { id: 'pack-tracking', name: 'Pack/Unit Tracking', description: 'Track pieces sold from packs', version: '1.0.0', enabled: true, category: 'inventory' },
  { id: 'expiry-alerts', name: 'Expiry Date Alerts', description: 'Alert for expiring products', version: '1.0.0', enabled: true, category: 'inventory' },
  { id: 'multi-language', name: 'Multi Language', description: 'Urdu/English support', version: '1.0.0', enabled: false, category: 'ui' },
  { id: 'employee-management', name: 'Employee Management', description: 'Staff accounts with limited access', version: '1.0.0', enabled: false, category: 'system' },
  { id: 'auto-backup', name: 'Auto Backup', description: 'Automatic data backup', version: '1.0.0', enabled: false, category: 'system' },
  { id: 'loyalty-program', name: 'Loyalty Program', description: 'Customer points and rewards', version: '1.0.0', enabled: false, category: 'customers' },
  { id: 'sms-alerts', name: 'SMS Alerts', description: 'Send SMS to customers', version: '1.0.0', enabled: false, category: 'marketing' },
  { id: 'advanced-reports', name: 'Advanced Reports', description: 'Detailed PDF reports', version: '1.0.0', enabled: false, category: 'analytics' },
  { id: 'supplier-orders', name: 'Supplier Auto Orders', description: 'Auto reorder from suppliers', version: '1.0.0', enabled: false, category: 'inventory' },
];

export const APP_VERSION = '2.0.0';
export const DEV_ACCESS_KEY = 'smartgrocery2026dev';

export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dev_mode') === 'true';
}

export function enableDevMode(key: string): boolean {
  if (key === DEV_ACCESS_KEY) {
    localStorage.setItem('dev_mode', 'true');
    return true;
  }
  return false;
}

export function disableDevMode(): void {
  localStorage.removeItem('dev_mode');
}

export function getPlugins(): Plugin[] {
  if (typeof window === 'undefined') return DEFAULT_PLUGINS;
  const saved = localStorage.getItem('app_plugins');
  if (saved) {
    try { return JSON.parse(saved); } catch { return DEFAULT_PLUGINS; }
  }
  return DEFAULT_PLUGINS;
}

export function savePlugins(plugins: Plugin[]): void {
  localStorage.setItem('app_plugins', JSON.stringify(plugins));
}

export function isPluginEnabled(pluginId: string): boolean {
  const plugins = getPlugins();
  return plugins.find(p => p.id === pluginId)?.enabled || false;
}
