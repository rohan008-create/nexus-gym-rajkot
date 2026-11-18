'use client';
import ReceiptTiers from '../ui/receipt-tiers';
import type { Plan } from '../ui/receipt-tiers-utils/types';
import { membershipPlans } from './membershipPlans';
import './membership-printer.css';

const plans: Plan[] = membershipPlans.map(item => ({
  id: item.id,
  name: item.name,
  tagline: item.description,
  cta: `Enquire about ${item.name}`,
  badge: item.id === 'pro' ? 'Popular' : undefined,
  features: item.benefits.length ? item.benefits : [item.focus, 'Enquiry welcome'],
  price: null,
}));

export default function NexusMembershipPrinter({ onEnquire }: { onEnquire: (plan: string) => void }) {
  return <section className="membership-print-section" id="membership" aria-labelledby="membership-print-title">
    <div className="membership-print-index"><span>07 / MEMBERSHIP</span><span>NEXUS FITNESS CLUB / RAJKOT</span></div>
    <header className="membership-print-header">
      <p className="membership-print-eyebrow">A NEW CHAPTER STARTS WITH YOU.</p>
      <h2 id="membership-print-title">YOUR PLAN. <em>YOUR MOVE.</em></h2>
      <p className="membership-print-description">Pick your pace. Print your next chapter.</p>
    </header>
    <ReceiptTiers plans={plans} onSelect={plan => onEnquire(plan.name)} scratchPlanId="pro" className="!bg-transparent !px-0 !py-10" />
    <p className="membership-print-note">Scratch the centre receipt to reveal the Pro plan · Drag, tap repeatedly or press Enter. Pricing, duration and benefits confirmed by Nexus.</p>
  </section>;
}
