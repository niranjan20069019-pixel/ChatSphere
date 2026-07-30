import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  themeColor: string;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setThemeColor: (color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      themeColor: 'indigo',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', next === 'dark');
        }
        set({ theme: next });
      },
      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
        set({ theme });
      },
      setThemeColor: (themeColor) => set({ themeColor }),
    }),
    { name: 'chatsphere-theme' }
  )
);
