import type { Metadata } from 'next';
import './globals.css';
import '../components/trainers/Lanyard.css';
import './themes.css';
import '../components/hero/gym-tour/gym-tour.css';
import '../components/sections/about-editorial.css';
import ThemeSwitch from '../components/layout/ThemeSwitch';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const title = 'NEXUS Fitness Club | Transform Your Potential';
const description = 'Rajkot’s premium fitness club. Build strength, endurance and the best version of you.';
export const metadata: Metadata = {
  title, description, icons: { icon: '/favicon-32.png' },
  ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: '/' } } : {}),
  openGraph: { title, description, type: 'website', locale: 'en_IN', siteName: 'Nexus Fitness Club', ...(siteUrl ? { url: siteUrl, images: ['/models/nexus-gym/arrival-street.webp'] } : {}) },
  twitter: { card: 'summary_large_image', title, description },
};
const themeBootstrap = `try{var t=localStorage.getItem('nexus-theme')==='light'?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}`;
const openingScrollBootstrap = `(() => {
  const navigation = performance.getEntriesByType('navigation')[0];
  const isOpeningPage = ['/', '/hero', '/hero/'].includes(location.pathname);
  if (navigation?.type !== 'reload' || !isOpeningPage || location.hash ||
      matchMedia('(prefers-reduced-motion: reduce)').matches || !('scrollRestoration' in history)) return;

  const previous = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  const scrollInputs = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
  let interacted = false;
  const onInput = () => { interacted = true; };
  for (const event of scrollInputs) addEventListener(event, onInput, { passive: true });
  addEventListener('pageshow', () => requestAnimationFrame(() => {
    if (!interacted && scrollY > 0) scrollTo({ top: 0, behavior: 'instant' });
    history.scrollRestoration = previous;
    for (const event of scrollInputs) removeEventListener(event, onInput);
  }), { once: true });
})();`;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      <script dangerouslySetInnerHTML={{ __html: openingScrollBootstrap }} />
    </head>
    <body>{children}<ThemeSwitch /></body>
  </html>;
}
