'use client';
import { useEffect, useState } from 'react';
import { Dumbbell, Moon, Sun } from 'lucide-react';
import './theme-cycle-switch.css';

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
  return <button className="gym-theme-switch gym-cycle-switch" type="button" role="switch" aria-label="Dark mode" aria-checked={theme === 'dark'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => choose(theme === 'dark' ? 'light' : 'dark')}>
    <span className="cycle-lens" aria-hidden="true"><Dumbbell size={21} strokeWidth={1.5} /></span>
    <span className="cycle-caption" aria-hidden="true">{theme === 'dark' ? <Moon size={10} /> : <Sun size={10} />}{theme === 'dark' ? 'NIGHT' : 'DAY'}</span>
  </button>;
}
