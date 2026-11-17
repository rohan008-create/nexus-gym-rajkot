import { ArrowUp, ArrowUpRight, MapPin, Phone } from 'lucide-react';
import { directionsUrl, nexusLocation } from '../location/globeConfig';
import './footer.css';

type FooterProps = { onTrial: () => void; onHome: () => void; onReplayIntro?: () => void };

export default function Footer({ onTrial, onHome, onReplayIntro }: FooterProps) {
  return <footer className="nexus-footer" aria-label="Nexus Fitness Club footer">
    <div className="nexus-footer-invite">
      <div><p className="nexus-footer-label"><span /> YOUR NEXT CHAPTER</p><h2>SHOW UP.<br /><em>LEVEL UP.</em></h2></div>
      <div className="nexus-footer-action"><p>One decision. A stronger you.<br />Make your next move at Nexus.</p><button className="primary-cta" onClick={onTrial}>Start your journey <ArrowUpRight size={20} aria-hidden /></button></div>
    </div>
    <div className="nexus-footer-grid">
      <div className="nexus-footer-brand"><a href="#home" aria-label="Nexus Fitness Club home"><img src="/assets/nexus-logo.png" alt="Nexus Fitness Club" width="211" height="80" /></a><p>Built for the work.<br />Made for your transformation.</p><span>RAJKOT, GUJARAT · INDIA</span></div>
      <nav aria-label="Footer navigation"><h3>EXPLORE THE CLUB</h3><a href="#about">Our story <ArrowUpRight size={14} aria-hidden /></a><a href="#programs">Training programs <ArrowUpRight size={14} aria-hidden /></a><a href="#booking">Book a visit <ArrowUpRight size={14} aria-hidden /></a><a href="#location">Find Nexus <ArrowUpRight size={14} aria-hidden /></a></nav>
      <div className="nexus-footer-contact"><h3>COME FIND YOUR STRONG</h3><a href={directionsUrl} target="_blank" rel="noopener noreferrer"><MapPin size={18} aria-hidden /><address>{nexusLocation.address}</address></a><a href={`tel:${nexusLocation.phone}`}><Phone size={16} aria-hidden /><span>{nexusLocation.phoneDisplay}</span></a><a className="nexus-footer-directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={15} aria-hidden /></a></div>
    </div>
    <div className="nexus-footer-bottom"><p>© {new Date().getFullYear()} Nexus Fitness Club. All rights reserved.</p><div>{onReplayIntro && <button onClick={onReplayIntro}>Replay intro <ArrowUpRight size={13} aria-hidden /></button>}<button onClick={onHome}>Back to top <ArrowUp size={15} aria-hidden /></button></div></div>
  </footer>;
}
