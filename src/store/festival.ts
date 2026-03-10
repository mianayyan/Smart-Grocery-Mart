import { create } from 'zustand';

type FestivalType = 'ramadan' | 'eid' | 'diwali' | 'christmas' | 'independence' | null;

interface FestivalTheme {
  name: string;
  emoji: string;
  gradient: string;
  primary: string;
  glow: string;
}

const FESTIVAL_THEMES: Record<string, FestivalTheme> = {
  ramadan: {
    name: 'Ramadan',
    emoji: '🌙',
    gradient: 'from-purple-900 via-indigo-900 to-blue-900',
    primary: '#6366f1',
    glow: 'shadow-purple-500/50',
  },
  eid: {
    name: 'Eid',
    emoji: '🎉',
    gradient: 'from-emerald-600 via-green-500 to-teal-400',
    primary: '#10b981',
    glow: 'shadow-emerald-500/50',
  },
  diwali: {
    name: 'Diwali',
    emoji: '🪔',
    gradient: 'from-orange-500 via-amber-500 to-yellow-400',
    primary: '#f59e0b',
    glow: 'shadow-amber-500/50',
  },
  christmas: {
    name: 'Christmas',
    emoji: '🎄',
    gradient: 'from-red-600 via-red-500 to-green-600',
    primary: '#ef4444',
    glow: 'shadow-red-500/50',
  },
  independence: {
    name: 'Independence Day',
    emoji: '🇵🇰',
    gradient: 'from-green-700 via-green-600 to-green-500',
    primary: '#15803d',
    glow: 'shadow-green-500/50',
  },
};

const FESTIVALS = [
  { type: 'ramadan', start: [2, 19], end: [3, 20] },
  { type: 'eid', start: [3, 21], end: [3, 25] },
  { type: 'independence', start: [8, 13], end: [8, 15] },
  { type: 'diwali', start: [10, 20], end: [10, 25] },
  { type: 'christmas', start: [12, 23], end: [12, 26] },
];

function detectFestival(): FestivalType {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  for (const f of FESTIVALS) {
    const [sm, sd] = f.start;
    const [em, ed] = f.end;
    if (
      (month > sm || (month === sm && day >= sd)) &&
      (month < em || (month === em && day <= ed))
    ) {
      return f.type as FestivalType;
    }
  }
  return null;
}

interface FestivalStore {
  currentFestival: FestivalType;
  festivalEnabled: boolean;
  darkMode: boolean;
  theme: FestivalTheme | null;
  toggleFestival: () => void;
  toggleDarkMode: () => void;
  checkFestival: () => void;
}

export const useFestivalStore = create<FestivalStore>((set) => ({
  currentFestival: detectFestival(),
  festivalEnabled: true,
  darkMode: false,
  theme: detectFestival() ? FESTIVAL_THEMES[detectFestival()!] : null,

  toggleFestival: () =>
    set((state) => ({ festivalEnabled: !state.festivalEnabled })),

  toggleDarkMode: () =>
    set((state) => ({ darkMode: !state.darkMode })),

  checkFestival: () => {
    const festival = detectFestival();
    set({
      currentFestival: festival,
      theme: festival ? FESTIVAL_THEMES[festival] : null,
    });
  },
}));
