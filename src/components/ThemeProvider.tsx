'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
interface ThemeContextValue { theme: Theme; setTheme: (t: Theme) => void; resolved: 'light' | 'dark'; }

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {}, resolved: 'light' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme) || 'system';
    setThemeState(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (t: Theme) => {
      const dark = t === 'dark' || (t === 'system' && mq.matches);
      root.classList.toggle('dark', dark);
      setResolved(dark ? 'dark' : 'light');
    };
    apply(theme);
    localStorage.setItem('theme', theme);
    const listener = () => { if (theme === 'system') apply(theme); };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
