'use client';
import { useState } from 'react';
import { Quote } from 'lucide-react';
import type { Testimonial } from './testimonials';

// Local Card/Avatar primitives: no shadcn migration or additional dependency.
function Avatar({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('');
  return <span className="voices-avatar">{src && !failed ? <img src={src} alt={src.endsWith('/avatar-placeholder.svg') ? `Placeholder avatar for ${name}` : `${name} profile`} width={36} height={36} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span aria-hidden>{initials}</span>}</span>;
}
export default function TestimonialCard({ item, preview = false }: { item: Testimonial; preview?: boolean }) {
  return <article className="voices-card">
    <div className="voices-card-top"><span className="voices-card-brand">NEXUS<span> / VOICES</span></span><Quote size={19} strokeWidth={1.2} aria-hidden /></div>
    {preview && <p className="voices-preview-label">AI-GENERATED DEMO<br />Not a genuine member review</p>}
    <blockquote>{item.review}</blockquote>
    <div className="voices-member"><Avatar name={item.name} src={item.avatar} /><div><p>{item.name}</p>{item.membershipType && <span>{item.membershipType}</span>}</div></div>
    {item.source && <p className="voices-source">Source: {item.source}</p>}
  </article>;
}
export function StoryPlaceholder({ index }: { index: number }) {
  const titles = ['YOUR NEXT\nCHAPTER.', 'STRENGTH IN\nCOMMUNITY.', 'A SPACE FOR\nYOUR STORY.'];
  return <div className="voices-card voices-placeholder">
    <div className="voices-card-top"><span className="voices-card-brand">NEXUS<span> / VOICES</span></span><span className="voices-placeholder-index">{String(index + 1).padStart(2, '0')}</span></div>
    <span className="voices-placeholder-line" />
    <p className="voices-placeholder-title">{titles[index % titles.length]}</p>
    <p className="voices-placeholder-copy">Space reserved for an approved member story.</p>
    <span className="voices-placeholder-bottom">THE COMMUNITY / COMING SOON</span>
  </div>;
}
