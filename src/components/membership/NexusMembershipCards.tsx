'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import BookPageCurl from '../ui/book-page-curl';
import { membershipPlans } from './membershipPlans';
import './membership-cards.css';

const finishes = [
  { gradient:'linear-gradient(145deg,#263f3c,#122725 65%,#0d1c1b)', accent:'#688e81' },
  { gradient:'linear-gradient(145deg,#e12b43,#a40d29 65%,#690b1e)', accent:'#e52a43' },
  { gradient:'linear-gradient(145deg,#42382c,#282119 65%,#181510)', accent:'#b99c62' },
];
export default function NexusMembershipCards({ onEnquire }: { onEnquire: (plan: string) => void }) {
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const center = () => {
      if (window.innerWidth > 1050 || !openPlan) { element.scrollTo({ left:0, behavior:"instant" }); return; }
      const card = element.querySelector<HTMLElement>('[data-open="true"]');
      if (!card) return;
      const left = card.getBoundingClientRect().left - element.getBoundingClientRect().left + element.scrollLeft;
      element.scrollTo({ left:left + card.offsetWidth / 2 - element.clientWidth / 2, behavior:reduced ? "instant" : "smooth" });
    };
    const timer = window.setTimeout(center, reduced ? 0 : 1020);
    window.addEventListener("resize", center);
    return () => { clearTimeout(timer); window.removeEventListener("resize", center); };
  }, [openPlan]);
  return <section className="membership-books" id="membership" aria-labelledby="membership-books-title">
    <div className="membership-books-index"><span>07 / MEMBERSHIP</span><span>NEXUS FITNESS CLUB / RAJKOT</span></div>
    <header className="membership-books-header"><p>TURN THE PAGE. RAISE YOUR GAME.</p><h2 id="membership-books-title">YOUR NEXT <em>CHAPTER.</em></h2><p>Three memberships. One stronger you. Open a plan and find your way forward.</p></header>
    <div ref={rail} className={`membership-books-grid${openPlan ? " has-open-book" : ""}`}>{membershipPlans.map((plan,index) => <article key={plan.id} data-open={openPlan === plan.id} className={`membership-book-card membership-book-${plan.id}`} style={{ '--book-accent':finishes[index].accent } as CSSProperties} aria-label={`${plan.name} membership`}>
      <BookPageCurl open={openPlan === plan.id} onOpenChange={next => setOpenPlan(next ? plan.id : null)} book={{ title:plan.name, tagline:plan.focus, credit:'NEXUS FITNESS CLUB · RAJKOT', genre:'Your training chapter', gradient:finishes[index].gradient, excerpt:plan.description, number:plan.number, price:plan.price ?? 'On request', duration:plan.duration ?? 'Ask Nexus', benefits:plan.benefits.length ? plan.benefits : ['Discuss your training goals', 'Explore membership options', 'Start with a trial enquiry'] }} />
      <button className="membership-book-choose" type="button" onClick={() => onEnquire(plan.name)} aria-label={`Enquire about ${plan.name}`}>Choose {plan.name}<ArrowUpRight size={17} aria-hidden="true" /></button>
    </article>)}</div>
    <p className="membership-books-note">Open a cover to explore. Pricing, duration and benefits are confirmed by the Nexus team.</p>
  </section>;
}
