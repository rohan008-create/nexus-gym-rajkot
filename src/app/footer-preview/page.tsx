import type { Metadata } from 'next';
import NexusFooter from '../../components/footer/NexusFooter';

export const metadata: Metadata = { title: 'Nexus | Footer Preview', robots: { index: false, follow: false } };

export default function FooterPreview() {
  return <main className="footer-preview">
    <div className="footer-preview-bar"><a href="/">← Back to Nexus</a><span>NEXUS / FOOTER PREVIEW</span><a href="/hero#booking">Book a visit ↗</a></div>
    <NexusFooter />
  </main>;
}
