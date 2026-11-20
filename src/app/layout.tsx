import type { Metadata } from 'next';
import './globals.css';
import '../components/trainers/Lanyard.css';
import './themes.css';
import ThemeSwitch from '../components/layout/ThemeSwitch';

export const metadata: Metadata = { title: 'NEXUS Fitness Club | Transform Your Potential', description: 'Rajkot’s premium fitness club. Build strength, endurance and the best version of you.', icons: { icon: '/assets/nexus-logo.png' } };
const themeBootstrap = `try{var t=localStorage.getItem('nexus-theme')==='light'?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}`;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body>{children}<ThemeSwitch /></body>
  </html>;
}
