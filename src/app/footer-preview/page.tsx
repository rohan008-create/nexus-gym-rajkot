import type { Metadata } from 'next';
import Link from 'next/link';
import NexusFooter from '../../components/footer/NexusFooter';
import '../../components/footer/footer.css';

export const metadata: Metadata = { title: 'Nexus | Footer Preview', robots: { index: false, follow: false } };

export default function FooterPreview() {
  return <main className="footer-preview">
    <div className="footer-preview-bar"><Link href="/">← Back to Nexus</Link><span>NEXUS / FOOTER PREVIEW</span><Link href="/hero#booking">Book a visit ↗</Link></div>
    <NexusFooter />
  </main>;
}
