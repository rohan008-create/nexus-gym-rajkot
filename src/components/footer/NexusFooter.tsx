'use client';

import { useEffect, useRef, useState } from 'react';
import { directionsUrl, nexusLocation } from '../location/globeConfig';
import './footer.css';

const explore = [['Our story', 'about'], ['Programs', 'programs'], ['Trainers', 'trainers']] as const;
const club = [['Membership', 'membership'], ['Book a visit', 'booking'], ['Location', 'location']] as const;

export default function NexusFooter({ linkBase = '/hero' }: { linkBase?: string }) {
  const root = useRef<HTMLElement>(null);
  const [animate, setAnimate] = useState(false);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAnimate(true);
    if (reduced.matches) { setRevealed(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(element);
    const onChange = () => { if (reduced.matches) { setRevealed(true); observer.disconnect(); } };
    reduced.addEventListener('change', onChange);
    return () => { observer.disconnect(); reduced.removeEventListener('change', onChange); };
  }, []);
  return <footer ref={root} className="nexus-simple-footer" data-animate={animate} data-revealed={revealed} aria-label="Nexus Fitness Club footer">
    <div className="nsf-top">
      <div className="nsf-brand">
        <a href={`${linkBase}#home`} aria-label="Nexus Fitness Club home"><img src="/assets/nexus-logo.png" width={2172} height={724} alt="Nexus Fitness Club" /></a>
        <p>Train. Transform. Evolve.</p>
        <p>Nexus Fitness Club, Rajkot, Gujarat.</p>
      </div>
      <nav className="nsf-links" aria-label="Footer navigation">
        <div><h2>Explore</h2>{explore.map(([label, id]) => <a key={id} href={`${linkBase}#${id}`}>{label}</a>)}</div>
        <div><h2>The club</h2>{club.map(([label, id]) => <a key={id} href={`${linkBase}#${id}`}>{label}</a>)}</div>
        <div>
          <h2>Visit</h2>
          <address><a href={directionsUrl} target="_blank" rel="noopener noreferrer">{nexusLocation.address}</a></address>
          <a href={`tel:${nexusLocation.phone}`}>{nexusLocation.phoneDisplay}</a>
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">Get directions</a>
          <a href={`${linkBase}#home`}>Back to top</a>
        </div>
      </nav>
    </div>
    <div className="nsf-rule" aria-hidden="true" />
    <div className="nsf-wordmark-wrap">
      <div className="nsf-wordmark" aria-hidden="true">NEXUS</div>
    </div>
    <div className="nsf-bottom">
      <p>© {new Date().getFullYear()} Nexus Fitness Club. All rights reserved.</p>
      <p>Programs and membership shown are illustrative.</p>
    </div>
  </footer>;
}
