import type { Metadata } from 'next';
import './globals.css';
import '../components/trainers/Lanyard.css';

export const metadata: Metadata = { title: 'NEXUS Fitness Club | Transform Your Potential', description: 'Rajkot’s premium fitness club. Build strength, endurance and the best version of you.', icons: { icon: '/assets/nexus-logo.png' } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en" className="dark"><body>{children}</body></html>; }
