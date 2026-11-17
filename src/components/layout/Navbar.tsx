'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, Menu, X } from 'lucide-react';
export type Destination = 'Home' | 'About' | 'Programs' | 'Plans' | 'Location';
export default function Navbar({ active, onNavigate, onTrial }: { active: Destination; onNavigate: (to: Destination) => void; onTrial: () => void }) {
  const [open, setOpen] = useState(false), [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { const update = () => setScrolled(window.scrollY > 25); update(); window.addEventListener('scroll', update, { passive: true }); return () => window.removeEventListener('scroll', update); }, []);
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); } }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [open]);
  const navigate = (destination: Destination) => { setOpen(false); onNavigate(destination); };
  return <header className={`site-nav ${scrolled ? 'is-scrolled' : ''}`}>
    <a href="#home" className="brand" aria-label="Nexus Fitness Club home" onClick={e => { e.preventDefault(); navigate('Home'); }}><img src="/assets/nexus-logo.png" alt="Nexus Fitness Club" width="2172" height="724" /></a>
    <nav className={`nav-links ${open ? 'is-open' : ''}`} id="primary-navigation" aria-label="Main navigation">
      {(['Home', 'About', 'Programs', 'Plans', 'Location'] as Destination[]).map(item => <a key={item} href={item === 'Home' ? '#home' : item === 'Programs' ? '#programs' : '#about'} aria-current={active === item ? 'page' : undefined} onClick={e => { e.preventDefault(); navigate(item); }}>{item}<ArrowUpRight size={14} aria-hidden /></a>)}
      <button className="nav-mobile-trial" onClick={() => { setOpen(false); onTrial(); }}>Book Free Trial</button>
    </nav>
    <button className="trial-button" aria-label="Book Free Trial" onClick={onTrial}><CalendarDays size={17} aria-hidden /><span>Book Free Trial</span></button>
    <button ref={toggle} className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(value => !value)}>{open ? <X /> : <Menu />}</button>
  </header>;
}
