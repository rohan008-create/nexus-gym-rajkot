'use client';
import type { CSSProperties } from 'react';
import { Facebook, Instagram, MessageCircle, Youtube } from 'lucide-react';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
import './social.css';
const platforms = [
  { name: 'Instagram', subtitle: 'Training & stories', category: 'THE DAILY REP', description: 'Training moments and stories from the Nexus floor.', action: 'Follow', href: 'https://www.instagram.com/', icon: Instagram, accent: '#ed567e', cover: 'program-strength.webp' },
  { name: 'YouTube', subtitle: 'Watch. Learn. Lift.', category: 'BEHIND THE SESSION', description: 'Get closer to training, technique and life at the club.', action: 'Watch', href: 'https://www.youtube.com/', icon: Youtube, accent: '#f04444', cover: 'program-personal.webp' },
  { name: 'Facebook', subtitle: 'The Nexus circle', category: 'OUR COMMUNITY', description: 'Stay close to club updates, conversations and community.', action: 'Connect', href: 'https://www.facebook.com/', icon: Facebook, accent: '#649bff', cover: 'program-functional.webp' },
  { name: 'WhatsApp', subtitle: 'Your next chapter', category: 'LET’S TALK TRAINING', description: 'Start a conversation about your next move with Nexus.', action: 'Chat', href: 'https://wa.me/', icon: MessageCircle, accent: '#55cb92', cover: 'program-cardio.webp' },
];
export default function NexusSocialSection() {

  return <section className="social-section" id="social" aria-labelledby="social-title">
    <div className="social-heading"><div><p className="social-eyebrow"><span aria-hidden="true" />Stay connected</p><h2 id="social-title">Follow the <em>Movement</em></h2></div><p className="social-sub">Beyond the workout. Inside the community. Find your daily dose of Nexus.</p></div>
    <BentoGrid className="social-bento-grid">{platforms.map((platform,index) => <BentoCard
      key={platform.name}
      className={`social-bento-card social-bento-${platform.name.toLowerCase()}`}
      style={{ '--social-accent': platform.accent } as CSSProperties}
      name={platform.name}
      Icon={platform.icon}
      description={platform.description}
      href={platform.href}
      cta={`${platform.action} on ${platform.name}`}
      external
      background={<div className="social-bento-background" aria-hidden="true"><img src={`/assets/photography/${platform.cover}`} alt="" loading="lazy" decoding="async" /><div className="social-bento-shade" /><span className="social-bento-category">0{index+1} / {platform.category}</span><span className="social-bento-mark">{platform.name === 'YouTube' ? 'PLAY' : platform.name === 'Instagram' ? 'NEXUS / DAILY' : platform.name === 'WhatsApp' ? 'SAY HELLO.' : 'THE CREW.'}</span></div>}
    />)}</BentoGrid>  </section>;
}
