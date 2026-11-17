'use client';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ReceiptPrinter } from '../ui/receipt-printer';
import { membershipPlans } from './membershipPlans';
import './membership-printer.css';

export default function NexusMembershipPrinter({ onEnquire }: { onEnquire: (plan: string) => void }) {
  const [selected, setSelected] = useState('pro');
  const [printed, setPrinted] = useState<{ plan: string; order: number } | null>(null);
  const plan = membershipPlans.find(item => item.id === selected)!;
  return <section className="membership-print-section" id="membership" aria-labelledby="membership-print-title" data-selected-plan={plan.id}>
    <div className="membership-print-index"><span>07 / MEMBERSHIP</span><span>NEXUS FITNESS CLUB / RAJKOT</span></div>
    <header className="membership-print-header">
      <p className="membership-print-eyebrow">A NEW CHAPTER STARTS WITH YOU.</p>
      <h2 id="membership-print-title">YOUR PLAN. <em>YOUR MOVE.</em></h2>
      <p className="membership-print-description">Pick your pace. Print your next chapter.</p>
    </header>
    <div className="membership-print-plans" role="group" aria-label="Choose a membership plan">
      {membershipPlans.map(item => <button key={item.id} type="button" aria-pressed={item.id === selected} aria-controls="membership-print-details" onClick={() => setSelected(item.id)}>
        <span className="membership-print-number">{item.number}</span>{item.name}<span className="membership-print-plan-dot" aria-hidden />
      </button>)}
    </div>
    <p className="membership-print-focus" aria-live="polite">{plan.focus}</p>
    <div className="membership-print-machine">
      <div className="membership-printer-stage">
        <ReceiptPrinter embedded appearance="dark" idlePreview className="membership-printer" store="NEXUS FITNESS CLUB" address="RAJKOT, GUJARAT" items={[]} currency="₹" taxRate={0}
            documentLabel="Plan preview" footer="BUILT BY EFFORT. CHOSEN BY YOU."
            summary={[
              { label: 'Plan', value: plan.name.toUpperCase() },
              { label: 'Focus', value: plan.focus },
              { label: 'Duration', value: plan.duration || 'Confirm with Nexus' },
              { label: 'Pricing', value: plan.price || 'Confirm with Nexus' },
              { label: 'Status', value: 'Enquiry welcome' },
            ]}
            onPrint={order => setPrinted({ plan: plan.name, order })} />
      </div>
    </div>
    <div className="membership-print-details" id="membership-print-details">
      <p className="membership-print-last" aria-live="polite">{printed ? `LAST PRINT / ${printed.plan.toUpperCase()} / #${String(printed.order).padStart(4, '0')}` : 'SELECT. PRINT. MAKE IT YOURS.'}</p>
      <button type="button" className="membership-print-enquire" onClick={() => onEnquire(plan.name)}>ENQUIRE ABOUT {plan.name.toUpperCase()}<ArrowUpRight size={17} aria-hidden /></button>
      <p className="membership-print-note">Plan preview. Pricing, duration and benefits confirmed by Nexus.</p>
    </div>
  </section>;
}
