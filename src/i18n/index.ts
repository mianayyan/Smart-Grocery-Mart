import en from './en';

export type Language = 'en';

export function t(key: string): string {
  const keys = key.split('.');
  let value: any = en;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

export default en;
