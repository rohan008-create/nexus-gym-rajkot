'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';
export default function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    const sync = (event: StorageEvent) => {
      if (event.key !== 'nexus-theme') return;
      const next = event.newValue === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      document.documentElement.classList.toggle('dark', next === 'dark');
      setTheme(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const choose = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
    try { localStorage.setItem('nexus-theme', next); } catch { /* Session theme still works when storage is unavailable. */ }
  };
  return <div className="theme-switch" role="group" aria-label="Color theme">
    <button type="button" aria-label="Light mode" aria-pressed={theme === 'light'} onClick={() => choose('light')}><Sun size={15} aria-hidden /><span>Light</span></button>
    <button type="button" aria-label="Dark mode" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}><Moon size={15} aria-hidden /><span>Dark</span></button>
  </div>;
}
