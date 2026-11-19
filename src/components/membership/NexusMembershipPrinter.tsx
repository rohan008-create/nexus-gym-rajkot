'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { ReceiptPrinter } from '../ui/receipt-printer';
import { membershipPlans, type MembershipPlan } from './membershipPlans';
import { useReducedMotion } from '../../hooks/useBagAnimation';
import './membership-printer.css';

function PlanPrinter({ plan, index, onEnquire }: { plan: MembershipPlan; index: number; onEnquire: (plan: string) => void }) {
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  return <motion.div className={`membership-auto-machine${plan.id === 'pro' ? ' is-popular' : ''}`} initial={reduced ? false : { opacity: 0, y: 70 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : index * .1, ease: [.22, 1, .36, 1] }}>
    <div className="membership-auto-label"><span>{plan.number} / {plan.name.toUpperCase()}</span><span>{plan.id === 'pro' ? 'FIND YOUR NEXT LEVEL' : 'MAKE YOUR MOVE'}</span></div>
    <ReceiptPrinter store="NEXUS FITNESS CLUB" address="RAJKOT, GUJARAT" printLabel={`Print ${plan.name} plan`} autoPrint autoPrintDelay={reduced ? 0 : 650 + index * 220} allowTear={false} onPrint={() => setReady(false)} onComplete={() => setReady(true)} className="membership-auto-printer !min-h-0 !bg-transparent"
      receiptContent={<fieldset className="membership-plan-content" disabled={!ready}>
        <p className="membership-paper-store">NEXUS FITNESS CLUB</p><p className="membership-paper-location">RAJKOT, GUJARAT</p>
        <div className="membership-paper-rule" />
        <div className="membership-paper-order"><span>YOUR NEXT CHAPTER</span><span>NO. {plan.number}</span></div>
        <h3>{plan.name.toUpperCase()}<span>MEMBERSHIP</span></h3>
        {plan.id === 'pro' && <span className="membership-paper-stamp">NEXT LEVEL</span>}
        <p className="membership-paper-description">{plan.description}</p>
        <div className="membership-paper-rule" />
        <p className="membership-paper-focus">{plan.focus.toUpperCase()}</p>
        <ul>{(plan.benefits.length ? plan.benefits : ['Discuss your training goals', 'Explore your membership options', 'Start with a trial enquiry']).map(benefit => <li key={benefit}><span>+</span>{benefit}</li>)}</ul>
        <div className="membership-paper-rule" />
        <div className="membership-paper-row"><span>PRICING</span><strong>{plan.price ?? 'ON REQUEST'}</strong></div>
        <div className="membership-paper-row"><span>DURATION</span><strong>{plan.duration ?? 'ASK NEXUS'}</strong></div>
        <p className="membership-paper-confirm">Pricing, duration and benefits confirmed by Nexus.</p>
        <button type="button" onClick={() => onEnquire(plan.name)} aria-label={`Enquire about ${plan.name}`}>CHOOSE {plan.name.toUpperCase()} <ArrowUpRight size={17} aria-hidden="true" /></button>
        <div className="membership-paper-barcode" aria-hidden="true" /><p className="membership-paper-thanks">YOUR PLAN. YOUR MOVE.</p>
      </fieldset>} />
  </motion.div>;
}
export default function NexusMembershipPrinter({ onEnquire }: { onEnquire: (plan: string) => void }) {
  return <section className="membership-print-section" id="membership" aria-labelledby="membership-print-title">
    <div className="membership-print-index"><span>07 / MEMBERSHIP</span><span>NEXUS FITNESS CLUB / RAJKOT</span></div>
    <header className="membership-print-header"><p className="membership-print-eyebrow">A NEW CHAPTER STARTS WITH YOU.</p><h2 id="membership-print-title">YOUR PLAN. <em>YOUR MOVE.</em></h2><p className="membership-print-description">Three ways forward. Your next chapter, freshly printed.</p></header>
    <div className="membership-auto-grid">{membershipPlans.map((plan,index) => <PlanPrinter key={plan.id} plan={plan} index={index} onEnquire={onEnquire} />)}</div>
    <p className="membership-print-note">Your plan prints automatically. Choose a plan to enquire with Nexus. Pricing, duration and benefits confirmed by the club.</p>
  </section>;
}
