'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { directionsUrl, nexusLocation } from '../location/globeConfig';
import './footer.css';

const explore = [['Our story', 'about'], ['Programs', 'programs'], ['Meet the trainers', 'trainers'], ['The essentials', 'products']] as const;
const club = [['Membership', 'membership'], ['Book a visit', 'booking'], ['Find the club', 'location']] as const;

export default function NexusFooter({ linkBase = '/hero' }: { linkBase?: string }) {
  const root = useRef<HTMLElement>(null);
  const [animate, setAnimate] = useState(false);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAnimate(true);
    if (reduced.matches || !('IntersectionObserver' in window)) { setRevealed(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { threshold: .08 });
    observer.observe(element);
    const onChange = () => { if (reduced.matches) { setRevealed(true); observer.disconnect(); } };
    reduced.addEventListener('change', onChange);
    return () => { observer.disconnect(); reduced.removeEventListener('change', onChange); };
  }, []);
  return <footer id="footer" ref={root} className="nexus-simple-footer nexus-footer" data-animate={animate} data-revealed={revealed} aria-label="Nexus Fitness Club footer">
    <div className="nf-inner">
      <div className="nf-eyebrow"><span>NEXUS FITNESS CLUB / RAJKOT</span><span>TRAIN. TRANSFORM. EVOLVE.</span></div>
      <div className="nf-invite nf-reveal">
        <h2>YOUR NEXT<br /><span>STARTS HERE.</span></h2>
        <div className="nf-invite-side"><a className="nf-visit" href={`${linkBase}#booking`}><span className="nf-visit-circle"><ArrowUpRight size={46} strokeWidth={1.25} aria-hidden /></span><span>BOOK A VISIT</span></a><p>Make room for a stronger you.<br />We'll meet you on the floor.</p></div>
      </div>
      <div className="nf-details nf-reveal">
        <div className="nf-brand">
          <a className="nf-logo" href={`${linkBase}#home`} aria-label="Nexus Fitness Club home">
            <img className="nf-logo-dark" src="/assets/nexus-logo.png" width={2172} height={724} alt="Nexus Fitness Club" />
            <img className="nf-logo-light" src="/assets/nexus-logo-light.webp" width={2172} height={724} alt="Nexus Fitness Club" />
          </a>
          <p>A place to put in the work.<br />A community to move forward with.</p>
          <span className="nf-brand-location">RAJKOT, GUJARAT / INDIA</span>
        </div>
        <nav className="nf-nav" aria-label="Footer navigation">
          <div><h3>Explore</h3>{explore.map(([label, id]) => <a key={id} href={`${linkBase}#${id}`}>{label}</a>)}</div>
          <div><h3>The club</h3>{club.map(([label, id]) => <a key={id} href={`${linkBase}#${id}`}>{label}</a>)}</div>
        </nav>
        <div className="nf-contact"><h3>Come find your Nexus.</h3><address>{nexusLocation.floor}, {nexusLocation.building}<br />{nexusLocation.street}, {nexusLocation.landmark}<br />{nexusLocation.area}, {nexusLocation.city}<br />{nexusLocation.state} {nexusLocation.postalCode}, {nexusLocation.country}</address><a className="nf-phone" href={`tel:${nexusLocation.phone}`}>{nexusLocation.phoneDisplay}</a><a className="nf-directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">GET DIRECTIONS <ArrowUpRight size={15} aria-hidden /></a></div>
      </div>
      <div className="nf-signoff"><span>SHOW UP.<br /><strong>GO BEYOND.</strong></span><a href={`${linkBase}#home`} className="nf-back-top" aria-label="Back to top"><span>BACK TO TOP</span><ArrowUp size={19} strokeWidth={1.4} aria-hidden /></a></div>
      <div className="nf-bottom"><p>© {new Date().getFullYear()} Nexus Fitness Club.</p><p>Programs and membership shown are illustrative.</p><span>BUILT FOR WHAT'S NEXT.</span></div>
    </div>
  </footer>;
}
