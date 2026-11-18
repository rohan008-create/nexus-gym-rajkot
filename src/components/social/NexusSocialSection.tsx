'use client';

import { Facebook, Instagram, MessageCircle, Youtube, type LucideIcon } from 'lucide-react';
import { Component } from '@/components/ui/dynamic-square';
import './social.css';

type SocialPlatform = {
  name: string;
  tag: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  icon: LucideIcon;
  accent: string;
};

const platforms: SocialPlatform[] = [
  {
    name: 'Instagram',
    tag: '48.2K',
    description: 'Daily training clips and real transformations from the NEXUS floor.',
    buttonText: 'Follow on Instagram',
    buttonHref: 'https://www.instagram.com/',
    icon: Instagram,
    accent: '#e1306c',
  },
  {
    name: 'YouTube',
    tag: '12.6K',
    description: 'Full sessions, form guides and a complete tour of the club.',
    buttonText: 'Subscribe on YouTube',
    buttonHref: 'https://www.youtube.com/',
    icon: Youtube,
    accent: '#ff2d3f',
  },
  {
    name: 'Facebook',
    tag: '22.4K',
    description: 'Events, announcements and stories from our community.',
    buttonText: 'Follow on Facebook',
    buttonHref: 'https://www.facebook.com/',
    icon: Facebook,
    accent: '#2f7dfb',
  },
  {
    name: 'WhatsApp',
    tag: '24/7',
    description: 'Questions about trials or plans? Message us and join the crew.',
    buttonText: 'Chat on WhatsApp',
    buttonHref: 'https://wa.me/',
    icon: MessageCircle,
    accent: '#25d366',
  },
];

export default function NexusSocialSection() {
  return (
    <section className="social-section" id="social" aria-labelledby="social-title">
      <div className="social-heading">
        <div>
          <p className="social-eyebrow"><span aria-hidden />Stay connected</p>
          <h2 id="social-title">Follow the <em>Movement</em></h2>
        </div>
        <p className="social-sub">
          Real work. Real people. Real results. Follow NEXUS for everything
          happening inside Rajkot&apos;s premium fitness club.
        </p>
      </div>

      <div className="social-grid">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <div className="social-card-slot" key={platform.name}>
              <span
                className="social-platform-icon"
                style={{ color: platform.accent, borderColor: `${platform.accent}66` }}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <Component
                title={platform.name}
                tag={platform.tag}
                description={platform.description}
                buttonText={platform.buttonText}
                buttonHref={platform.buttonHref}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
