'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Destination } from '../layout/Navbar';
import GymTourHero from './gym-tour/GymTourHero';
import NexusOpening from './NexusOpening';
import type { TourStatus } from './gym-tour/gymTourConfig';
import TrialDialog from './TrialDialog';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useHeroTransition } from './RopeScrollController';
import AboutNexus, { AboutPanel } from '../sections/AboutNexus';
import type { RopeLayout } from './ropeGeometry';
import ProgramsSection from '../sections/ProgramsSection';
import ArmorySection from '../armory/ArmorySection';
import NexusAdvantageSection from '../advantage/NexusAdvantageSection';
import NexusTrainersSection from '../trainers/NexusTrainersSection';
import NexusMembershipCards from '../membership/NexusMembershipCards';
import GymProductsSection from '../products/GymProductsSection';
import WhatsAppBooking from '../booking/WhatsAppBooking';
import NexusVoices from '../voices/NexusVoices';
import RoadToNexus from '../location/RoadToNexus';
import NexusSocialSection from '../social/NexusSocialSection';
import SmoothScroll from '../layout/SmoothScroll';
import NexusFooter from '../footer/NexusFooter';
import './iron-world.css';

export default function HeroSection() {
  const root = useRef<HTMLElement>(null), progress = useRef(0), pointer = useRef({ x: 0, y: 0 });
  const velocity = useRef(0);
  const layout = useRef<RopeLayout>({ unit: .00715, viewHeight: 6.43, heroHeight: 900, rootTop: 0, aboutStart: 1020, aboutEnd: 1500, headingPageY: 1120, version: 0 });
  const reduced = useReducedMotion();
  const [openingFinished, setOpeningFinished] = useState(false);
  const finishOpening = useCallback(() => setOpeningFinished(true), []);
  const [status, setStatus] = useState<TourStatus>('loading');
  const [active, setActive] = useState<Destination>('Home'), [panel, setPanel] = useState<AboutPanel>('About');
  const [trial, setTrial] = useState(false);
  const [membershipPlan, setMembershipPlan] = useState<string | undefined>();
  const sectionChanged = useCallback((section: 'Home' | 'About' | 'Programs') => setActive(current => section === 'About' && (current === 'Plans' || current === 'Location') ? current : section), []);
  useHeroTransition(root, { progress, pointer, velocity, layout }, reduced, sectionChanged, true, true);
  const navigate = useCallback((destination: Destination) => {
    setActive(destination);
    if (destination !== 'Home' && destination !== 'Programs' && destination !== 'Plans') setPanel(destination);
    document.getElementById(destination === 'Home' ? 'home' : destination === 'Programs' ? 'programs' : destination === 'Plans' ? 'membership' : 'about')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  }, [reduced]);
  const content = useMemo(() => <main ref={root} className="site-shell rope-experience" data-rope-status={status} onPointerMove={event => { pointer.current.x = event.clientX / window.innerWidth * 2 - 1; pointer.current.y = 1 - event.clientY / window.innerHeight * 2; }} onPointerLeave={() => { pointer.current.x = 0; pointer.current.y = 0; }}>
    <div className="hero-experience">
      <GymTourHero active={true} reduced={reduced} onStatus={setStatus} onTrial={() => setTrial(true)} onExplorePrograms={() => navigate('Programs')} />
      <section className="continuation-section about-section" id="about" aria-labelledby="about-title">
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
    <NexusMembershipCards onEnquire={plan => { setMembershipPlan(plan); setTrial(true); }} />
    <GymProductsSection />
    <WhatsAppBooking />
    <NexusVoices />
    <RoadToNexus />
    <NexusSocialSection />
    <NexusFooter linkBase="" />
    <TrialDialog open={trial} membershipPlan={membershipPlan} onClose={() => { setTrial(false); setMembershipPlan(undefined); }} />
  </main>, [status, active, panel, trial, membershipPlan, reduced, navigate]);
  return <SmoothScroll>
    {!openingFinished && <NexusOpening onFinish={finishOpening} />}
    {content}
  </SmoothScroll>;
}
