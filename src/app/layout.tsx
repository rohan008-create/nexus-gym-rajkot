import type { Metadata } from 'next';
import './globals.css';
import '../components/trainers/Lanyard.css';
import './themes.css';
import ThemeSwitch from '../components/layout/ThemeSwitch';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const title = 'NEXUS Fitness Club | Transform Your Potential';
const description = 'Rajkot’s premium fitness club. Build strength, endurance and the best version of you.';
export const metadata: Metadata = {
  title, description, icons: { icon: '/assets/nexus-logo.png' },
  ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: '/' } } : {}),
  openGraph: { title, description, type: 'website', locale: 'en_IN', siteName: 'Nexus Fitness Club', ...(siteUrl ? { url: siteUrl, images: ['/models/nexus-gym/arrival-street.webp'] } : {}) },
  twitter: { card: 'summary_large_image', title, description },
};
const themeBootstrap = `try{var t=localStorage.getItem('nexus-theme')==='light'?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}`;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body>{children}<ThemeSwitch /></body>
  </html>;
}
