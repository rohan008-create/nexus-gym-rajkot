'use client';

import { ArrowUp, ArrowUpRight, Phone } from 'lucide-react';
import { directionsUrl, nexusLocation } from '../location/globeConfig';
import RisingHorizon from './RisingHorizon';
import './footer.css';

const links = [['Our story', 'about'], ['Programs', 'programs'], ['Trainers', 'trainers'], ['Membership', 'membership'], ['Book a visit', 'booking'], ['Location', 'location']];

export default function NexusFooter({ linkBase = '/hero' }: { linkBase?: string }) {
  return <footer className="nexus-simple-footer" aria-label="Nexus Fitness Club footer">
    <div className="nsf-details">
      <div className="nsf-brand"><a href={`${linkBase}#home`} aria-label="Nexus Fitness Club home"><img src="/assets/nexus-logo.png" width="2172" height="724" alt="Nexus Fitness Club" /></a><p>Train. Transform. Evolve.</p><span>RAJKOT, GUJARAT</span></div>
      <nav aria-label="Footer navigation"><h2>THE CLUB</h2><div>{links.map(([label, id]) => <a key={id} href={`${linkBase}#${id}`}>{label}<ArrowUpRight size={12} aria-hidden /></a>)}</div></nav>
      <div className="nsf-contact"><h2>FIND YOUR STRONG</h2><a href={directionsUrl} target="_blank" rel="noopener noreferrer"><address>{nexusLocation.address}</address></a><a className="nsf-phone" href={`tel:${nexusLocation.phone}`}><Phone size={14} aria-hidden />{nexusLocation.phoneDisplay}</a><a className="nsf-directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={14} aria-hidden /></a></div>
    </div>
    <div className="nsf-invite">
      <RisingHorizon />
      <div className="nsf-invite-copy"><p>YOUR NEXT CHAPTER</p><h2>SHOW UP.<br /><span>LEVEL UP.</span></h2><a className="nsf-cta" href={`${linkBase}#booking`}>Book a club visit <ArrowUpRight size={18} aria-hidden /></a></div>
    </div>
    <div className="nsf-bottom"><p>© {new Date().getFullYear()} Nexus Fitness Club. All rights reserved.</p><a href={`${linkBase}#home`}>Back to top <ArrowUp size={14} aria-hidden /></a></div>
  </footer>;
}
