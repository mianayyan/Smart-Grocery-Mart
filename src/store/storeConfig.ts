'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

interface StoreConfig {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeEmail: string;
  storeLogo: string;
  storeTagline: string;
  currency: string;
  taxRate: number;
  lowStockAlert: number;
  receiptFooter: string;
  whatsappNumber: string;
  loaded: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: (data: Partial<StoreConfig>) => Promise<boolean>;
  setStoreLogo: (logo: string) => void;
}

export const useStoreConfig = create<StoreConfig>((set, get) => ({
  storeName: 'Smart Grocery Mart',
  storePhone: '',
  storeAddress: '',
  storeEmail: '',
  storeLogo: '',
  storeTagline: 'Complete Store Management',
  currency: 'Rs.',
  taxRate: 0,
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
        storeEmail: profile.store_email || '',
        storeLogo: profile.store_logo || '',
        storeTagline: profile.store_tagline || 'Complete Store Management',
        taxRate: Number(profile.tax_rate) || 0,
        lowStockAlert: Number(profile.low_stock_alert) || 10,
        receiptFooter: profile.receipt_footer || 'Thank you for shopping!',
        whatsappNumber: profile.whatsapp_number || '',
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
    if (data.storeEmail !== undefined) dbData.store_email = data.storeEmail;
    if (data.storeLogo !== undefined) dbData.store_logo = data.storeLogo;
    if (data.storeTagline !== undefined) dbData.store_tagline = data.storeTagline;
    if (data.taxRate !== undefined) dbData.tax_rate = data.taxRate;
    if (data.lowStockAlert !== undefined) dbData.low_stock_alert = data.lowStockAlert;
    if (data.receiptFooter !== undefined) dbData.receipt_footer = data.receiptFooter;
    if (data.whatsappNumber !== undefined) dbData.whatsapp_number = data.whatsappNumber;

    const { error } = await supabase.from('profiles').update(dbData).eq('id', user.id);
    if (error) return false;

    set({ ...data });
    return true;
  },

  setStoreLogo: (logo: string) => {
    set({ storeLogo: logo });
  },
}));
