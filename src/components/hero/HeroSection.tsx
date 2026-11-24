'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import Navbar from '../layout/Navbar';
import GymTourHero from './gym-tour/GymTourHero';
import NexusOpening from './NexusOpening';
import type { TourStatus } from './gym-tour/gymTourConfig';
import TrialDialog from './TrialDialog';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useHeroTransition } from './RopeScrollController';
import AboutNexus from '../sections/AboutNexus';
import type { RopeLayout } from './ropeGeometry';
import ProgramsSection from '../sections/ProgramsSection';
import NexusAdvantageSection from '../advantage/NexusAdvantageSection';
import NexusTrainersSection from '../trainers/NexusTrainersSection';
import NexusMembershipCards from '../membership/NexusMembershipCards';
import GymProductsSection from '../products/GymProductsSection';
import WhatsAppBooking from '../booking/WhatsAppBooking';
import NexusVoices from '../voices/NexusVoices';
import RoadToNexus from '../location/RoadToNexus';
import VisitFAQ from '../sections/VisitFAQ';
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
  const [trial, setTrial] = useState(false);
  const [membershipPlan, setMembershipPlan] = useState<string | undefined>();
  useHeroTransition(root, { progress, pointer, velocity, layout }, reduced, undefined, true, true);
  const explorePrograms = useCallback(() => {
    document.getElementById('programs')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  }, [reduced]);
  const content = useMemo(() => <main ref={root} className="site-shell rope-experience" data-rope-status={status} onPointerMove={event => { pointer.current.x = event.clientX / window.innerWidth * 2 - 1; pointer.current.y = 1 - event.clientY / window.innerHeight * 2; }} onPointerLeave={() => { pointer.current.x = 0; pointer.current.y = 0; }}>
    {openingFinished && <Navbar onTrial={() => setTrial(true)} />}
    <div className="hero-experience">
      <GymTourHero reduced={reduced} onStatus={setStatus} onTrial={() => setTrial(true)} onExplorePrograms={explorePrograms} />
      <section className="continuation-section about-section" id="about" aria-labelledby="about-title">
        <AboutNexus panel="About" onTrial={() => setTrial(true)} />
      </section>
    </div>
    <ProgramsSection onTrial={() => setTrial(true)} />
    <NexusAdvantageSection />
    <NexusTrainersSection />
    <NexusVoices />
    <NexusMembershipCards onEnquire={plan => { setMembershipPlan(plan); setTrial(true); }} />
    <RoadToNexus />
    <VisitFAQ />
    <WhatsAppBooking />
    <GymProductsSection />
    <NexusSocialSection />
    <NexusFooter linkBase="" />
    <TrialDialog open={trial} membershipPlan={membershipPlan} onClose={() => { setTrial(false); setMembershipPlan(undefined); }} />
  </main>, [status, openingFinished, trial, membershipPlan, reduced, explorePrograms]);
  return <SmoothScroll>
    {!openingFinished && <NexusOpening onFinish={finishOpening} />}
    {content}
  </SmoothScroll>;
}
