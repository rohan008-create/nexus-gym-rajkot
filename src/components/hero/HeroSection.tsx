'use client';
import { memo, useCallback, useRef, useState } from 'react';
import Navbar from '../layout/Navbar';
import GymTourHero from './gym-tour/GymTourHero';
import NexusOpening from './NexusOpening';
import type { TourStatus } from './gym-tour/gymTourConfig';
import TrialDialog from './TrialDialog';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useHeroTransition } from './useHeroTransition';
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

// Below-the-fold sections have no tour/dialog state. Keeping them behind a memo
// means a tour status change or opening the trial dialog cannot reconcile them.
const PageSections = memo(function PageSections({ onTrial, onEnquire }: {
  onTrial: () => void;
  onEnquire: (plan: string) => void;
}) {
  return <>
    <ProgramsSection onTrial={onTrial} />
    <NexusAdvantageSection />
    <NexusTrainersSection />
    <NexusVoices />
    <NexusMembershipCards onEnquire={onEnquire} />
    <RoadToNexus />
    <VisitFAQ />
    <WhatsAppBooking />
    <GymProductsSection />
    <NexusSocialSection />
    <NexusFooter linkBase="" />
  </>;
});

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
  const openTrial = useCallback(() => setTrial(true), []);
  const closeTrial = useCallback(() => { setTrial(false); setMembershipPlan(undefined); }, []);
  const enquire = useCallback((plan: string) => { setMembershipPlan(plan); setTrial(true); }, []);
  const explorePrograms = useCallback(() => {
    document.getElementById('programs')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  }, [reduced]);
  return <SmoothScroll>
    {!openingFinished && <NexusOpening onFinish={finishOpening} />}
    <main ref={root} className="site-shell rope-experience" data-rope-status={status} onPointerMove={event => { pointer.current.x = event.clientX / window.innerWidth * 2 - 1; pointer.current.y = 1 - event.clientY / window.innerHeight * 2; }} onPointerLeave={() => { pointer.current.x = 0; pointer.current.y = 0; }}>
      {openingFinished && <Navbar onTrial={openTrial} />}
      <div className="hero-experience">
        <GymTourHero openingFinished={openingFinished} reduced={reduced} onStatus={setStatus} onTrial={openTrial} onExplorePrograms={explorePrograms} />
        <section className="continuation-section about-section" id="about" aria-labelledby="about-title">
          <AboutNexus panel="About" onTrial={openTrial} />
        </section>
      </div>
      <PageSections onTrial={openTrial} onEnquire={enquire} />
      <TrialDialog open={trial} membershipPlan={membershipPlan} onClose={closeTrial} />
    </main>
  </SmoothScroll>;
}
