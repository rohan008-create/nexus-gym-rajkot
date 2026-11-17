'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
export default function TrialDialog({ open, onClose, membershipPlan }: { open: boolean; onClose: () => void; membershipPlan?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState(''), [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) { setMessage(''); setCopied(false); dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [open]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setMessage(`Hi Nexus Fitness Club, I'd like to enquire about ${membershipPlan ? `the ${membershipPlan} membership plan` : 'a free trial'}.\n${membershipPlan ? `Selected plan: ${membershipPlan} (demo; please confirm pricing and benefits)\n` : ''}Name: ${data.get('name')}\nMy goal: ${data.get('goal')}\nPreferred visit: ${data.get('date') || 'Please help me choose a date'}`);
  };
  return <dialog className="trial-dialog" ref={dialog} onCancel={onClose} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }} aria-labelledby="trial-title">
    <button className="dialog-close" aria-label="Close trial enquiry" onClick={onClose}><X size={20} /></button>
    <span className="eyebrow">YOUR FIRST STEP</span><h2 id="trial-title">Make it<br /><em>happen.</em></h2>
    <p className="demo-notice">Demo enquiry. No booking or personal information is sent.</p>
    {membershipPlan && <p className="trial-membership-plan">Selected membership: <strong>{membershipPlan}</strong> · Pricing and benefits to be confirmed.</p>}
    {!message ? <form onSubmit={submit}>
      <label>Your name<input name="name" autoComplete="given-name" placeholder="First name" required maxLength={70} /></label>
      <label>Your goal<select name="goal"><option>Build strength</option><option>Improve endurance</option><option>Explore the club</option></select></label>
      <label>Preferred date <span>(optional)</span><input type="date" name="date" /></label>
      <button className="primary-cta" type="submit">Prepare enquiry <span aria-hidden>↗</span></button>
    </form> : <div className="enquiry-result" role="status"><Check size={24} /><h3>Your enquiry is ready.</h3><p>Copy it for later. Live booking details will be added when confirmed by the club.</p><pre>{message}</pre><button className="primary-cta" onClick={async () => { try { await navigator.clipboard.writeText(message); setCopied(true); } catch { const blob = new Blob([message], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'nexus-trial-enquiry.txt'; link.click(); URL.revokeObjectURL(url); } }}><Copy size={16} />{copied ? 'Copied' : 'Copy enquiry'}</button></div>}
  </dialog>;
}
