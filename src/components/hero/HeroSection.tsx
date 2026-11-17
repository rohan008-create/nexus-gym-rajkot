'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, Zap } from 'lucide-react';
import Navbar, { Destination } from '../layout/Navbar';
import IronWorldScene, { GymStatus } from './IronWorldScene';
import TrialDialog from './TrialDialog';
import { useReducedMotion } from '../../hooks/useBagAnimation';
import { useHeroTransition } from './RopeScrollController';
import AboutNexus, { AboutPanel } from '../sections/AboutNexus';
import type { RopeLayout } from './ropeGeometry';
import AboutGymVisual from '../sections/AboutGymVisual';
import ProgramsSection from '../sections/ProgramsSection';
import ArmorySection from '../armory/ArmorySection';
import NexusAdvantageSection from '../advantage/NexusAdvantageSection';
import NexusTrainersSection from '../trainers/NexusTrainersSection';
import NexusLockerRoom from '../membership/NexusLockerRoom';
import HumanEvolution from '../evolution/HumanEvolution';
import WhatsAppBooking from '../booking/WhatsAppBooking';
import NexusVoices from '../voices/NexusVoices';
import RoadToNexus from '../location/RoadToNexus';
import SmoothScroll from '../layout/SmoothScroll';
import NexusFooter from '../footer/NexusFooter';
import './iron-world.css';

export type HeroSectionProps = { onReplayIntro?: () => void; entranceEnabled?: boolean; interactive?: boolean; onPrepared?: () => void };
export default function HeroSection({ onReplayIntro, entranceEnabled = true, interactive = true, onPrepared }: HeroSectionProps) {
  const root = useRef<HTMLElement>(null), progress = useRef(0), pointer = useRef({ x: 0, y: 0 });
  const velocity = useRef(0);
  const layout = useRef<RopeLayout>({ unit: .00715, viewHeight: 6.43, heroHeight: 900, rootTop: 0, aboutStart: 1020, aboutEnd: 1500, headingPageY: 1120, version: 0 });
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<GymStatus>('loading');
  const [active, setActive] = useState<Destination>('Home'), [panel, setPanel] = useState<AboutPanel>('About');
  const [trial, setTrial] = useState(false);
  const [membershipPlan, setMembershipPlan] = useState<string | undefined>();
  const sectionChanged = useCallback((section: 'Home' | 'About' | 'Programs') => setActive(current => section === 'About' && (current === 'Plans' || current === 'Location') ? current : section), []);
  useHeroTransition(root, { progress, pointer, velocity, layout }, reduced, sectionChanged, entranceEnabled);
  useEffect(() => {
    if (status !== 'loading') onPrepared?.();
  }, [status, onPrepared]);
  const navigate = useCallback((destination: Destination) => {
    setActive(destination);
    if (destination !== 'Home' && destination !== 'Programs') setPanel(destination);
    document.getElementById(destination === 'Home' ? 'home' : destination === 'Programs' ? 'programs' : 'about')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  }, [reduced]);
  // Entrance timing only plays the prepared GSAP timeline. Keep the large
  // landing tree unchanged while the two front sheets are animating.
  const content = useMemo(() => <main ref={root} className="site-shell rope-experience" data-rope-status={status} onPointerMove={event => { pointer.current.x = event.clientX / window.innerWidth * 2 - 1; pointer.current.y = 1 - event.clientY / window.innerHeight * 2; }} onPointerLeave={() => { pointer.current.x = 0; pointer.current.y = 0; }}>
    <Navbar active={active} onNavigate={navigate} onTrial={() => setTrial(true)} />
    <div className="hero-experience">
      <section className="hero-section iron-world-hero" id="home" aria-labelledby="hero-title">
        <IronWorldScene reduced={reduced} onStatus={setStatus} active={interactive} pointer={pointer} />
        <div className="hero-copy">
          <p className="eyebrow" data-reveal><span aria-hidden />RAJKOT. THIS IS YOUR NEXT LEVEL.<span aria-hidden /></p>
          <p className="iron-world-kicker">NEXUS FITNESS CLUB</p>
          <h1 id="hero-title" tabIndex={-1}><span className="headline-line"><span>BEYOND</span></span><span className="headline-line accent"><span>LIMITS.</span></span></h1>
          <p className="hero-description" data-reveal>Built by effort. Defined by you.<br />Find your strength at Nexus.</p>
          <div className="hero-actions" data-reveal><button className="primary-cta" onClick={() => setTrial(true)}><Zap size={17} fill="currentColor" aria-hidden /><span>Book a Trial</span><ArrowRight size={21} aria-hidden /></button><button className="secondary-cta" onClick={() => navigate('Programs')}>Explore Programs<ArrowUpRight size={17} aria-hidden /></button></div>
        </div>
        <div className="kinetic-footer"><span>01 / THE MINDSET</span><span>STRENGTH <i /> CONDITIONING <i /> COMMUNITY</span><span>RAJKOT, GUJARAT ↗</span></div>
        {status === 'error' && <p className="scene-notice" role="status">Explore Nexus. Your next chapter starts here.</p>}
        <button className="scroll-indicator" onClick={() => navigate('About')}>SCROLL TO EXPLORE<span aria-hidden><ChevronDown size={23} /><ChevronDown size={23} /></span></button>
      </section>
      <section className="continuation-section about-section" id="about" aria-labelledby="about-title">
        <AboutGymVisual />
        <AboutNexus panel={panel} onTrial={() => setTrial(true)} />
      </section>
    </div>
    <ProgramsSection onTrial={() => setTrial(true)} />
    <ArmorySection onExplorePrograms={() => {
      const programs = document.getElementById('programs');
      if (!programs) return;
      setActive('Programs');
      // Use a document coordinate: scrollIntoView can include the currently
      // fixed showcase's pin offset when navigating back out of the Armory.
      window.scrollTo({ top: programs.getBoundingClientRect().top + window.scrollY - 80, behavior: reduced ? 'instant' : 'smooth' });
    }} />
    <NexusAdvantageSection />
    <NexusTrainersSection />
    <NexusLockerRoom onEnquire={plan => { setMembershipPlan(plan); setTrial(true); }} />
    <HumanEvolution onJourney={() => { setMembershipPlan(undefined); setTrial(true); }} />
    <WhatsAppBooking />
    <NexusVoices />
    <RoadToNexus />
    <NexusFooter linkBase="" />
    <TrialDialog open={trial} membershipPlan={membershipPlan} onClose={() => { setTrial(false); setMembershipPlan(undefined); }} />
  </main>, [status, active, panel, trial, membershipPlan, reduced, interactive, navigate, onReplayIntro]);
  return <SmoothScroll enabled={interactive}>{content}</SmoothScroll>;
}
