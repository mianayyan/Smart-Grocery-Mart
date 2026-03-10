import { create } from 'zustand';
import { t } from '@/i18n';

interface LanguageStore {
  language: 'en';
  translate: (key: string) => string;
}

export const useLanguageStore = create<LanguageStore>(() => ({
  language: 'en',
  translate: (key: string) => t(key),
}));
