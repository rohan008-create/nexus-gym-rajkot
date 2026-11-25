'use client';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { usePageScroller } from './SmoothScroll';
import './navbar.css';

const sections = [
  ['Home', 'home'],
  ['About', 'about'],
  ['Programs', 'programs'],
  ['Membership', 'membership'],
  ['Location', 'location'],
  ['Products', 'products'],
] as const;
type Destination = typeof sections[number][1];

export default function Navbar({ onTrial }: { onTrial: () => void }) {
  const [open, setOpen] = useState(false);
  const [afterHero, setAfterHero] = useState(false);
  const [active, setActive] = useState<Destination>('home');
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const scroller = usePageScroller();

  useEffect(() => {
    const targets = sections.map(([, id]) => ({ id, element: document.getElementById(id) }));
    const hero = document.getElementById('home');
    let frame = 0;
    const update = () => {
      frame = 0;
      const heroIsAboveViewport = !hero || hero.getBoundingClientRect().bottom <= 1;
      setAfterHero(heroIsAboveViewport);
      if (!heroIsAboveViewport) setOpen(false);
      const line = (header.current?.offsetHeight ?? 0) + 24;
      let current: Destination = 'home';
      for (const { id, element } of targets) {
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    if (hero) observer.observe(hero);
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, destination: Destination) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const section = document.getElementById(destination);
    if (!section) return;
    event.preventDefault();
    setOpen(false);
    setActive(destination);
    const target = section.getBoundingClientRect().top + window.scrollY;
    if (scroller?.current) scroller.current.scrollTo(target, { immediate: true });
    else window.scrollTo({ top: target, behavior: 'instant' });
    const heading = section.querySelector<HTMLElement>('h1, h2');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };

  return <header ref={header} className="site-nav" hidden={!afterHero} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); close(); }
  }}>
    <a href="#home" className="brand" aria-label="Nexus Fitness Club home" onClick={event => navigate(event, 'home')}>
      <img src="/assets/nexus-logo.webp" alt="" width={2172} height={724} />
    </a>
    <button ref={toggle} type="button" className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(value => !value)}>{open ? <X aria-hidden /> : <Menu aria-hidden />}</button>
    <nav className={`nav-links ${open ? 'is-open' : ''}`} id="primary-navigation" aria-label="Main navigation" data-lenis-prevent={open ? '' : undefined}>
      {sections.map(([label, id]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={event => navigate(event, id)}>{label}<ArrowUpRight size={14} aria-hidden /></a>)}
      <button type="button" className="nav-mobile-trial" onClick={() => { close(); onTrial(); }}>Book a trial</button>
    </nav>
    <button type="button" className="trial-button" onClick={onTrial}>Book a trial <ArrowUpRight size={15} aria-hidden /></button>
  </header>;
}
