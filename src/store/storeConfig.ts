import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

interface StoreConfig {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeEmail: string;
  storeLogo: string;
  storeTagline: string;
  taxRate: number;
  currency: string;
  lowStockAlert: number;
  receiptFooter: string;
  whatsappNumber: string;
  loaded: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: (data: Partial<StoreConfig>) => Promise<boolean>;
}

export const useStoreConfig = create<StoreConfig>((set, get) => ({
  storeName: 'Smart Grocery Mart',
  storePhone: '',
  storeAddress: '',
  storeEmail: '',
  storeLogo: '🛒',
  storeTagline: 'Complete Store Management',
  taxRate: 0,
  currency: 'Rs.',
  lowStockAlert: 10,
  receiptFooter: 'Thank you for shopping!',
  whatsappNumber: '',
  loaded: false,

  loadConfig: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      set({
        storeName: profile.store_name || 'Smart Grocery Mart',
        storePhone: profile.store_phone || '',
        storeAddress: profile.store_address || '',
        taxRate: Number(profile.tax_rate) || 0,
        lowStockAlert: Number(profile.low_stock_alert) || 10,
        loaded: true,
      });
    }
  },

  updateConfig: async (data) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const dbData: any = {};
    if (data.storeName !== undefined) dbData.store_name = data.storeName;
    if (data.storePhone !== undefined) dbData.store_phone = data.storePhone;
    if (data.storeAddress !== undefined) dbData.store_address = data.storeAddress;
    if (data.taxRate !== undefined) dbData.tax_rate = data.taxRate;
    if (data.lowStockAlert !== undefined) dbData.low_stock_alert = data.lowStockAlert;

    const { error } = await supabase.from('profiles').update(dbData).eq('id', user.id);
    if (error) return false;

    set({ ...data });
    return true;
  },
}));
