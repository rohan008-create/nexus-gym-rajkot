'use client';
import { FormEvent, useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Modal, ModalBody, ModalContent, ModalFooter } from '../ui/animated-modal';
import { NEXUS_WHATSAPP_NUMBER } from '../booking/bookingConfig';
import { localDateKey, normalizeRecipient } from '../booking/bookingUtils';

export default function TrialDialog({ open, onClose, membershipPlan }: { open: boolean; onClose: () => void; membershipPlan?: string }) {
  const [message, setMessage] = useState(''), [copied, setCopied] = useState(false);
  const handleOpenChange = useCallback((next: boolean) => {
    if (next) return;
    setMessage('');
    setCopied(false);
    onClose();
  }, [onClose]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setMessage(`Hi Nexus Fitness Club, I'd like to enquire about ${membershipPlan ? `the ${membershipPlan} membership plan` : 'a trial session'}.\n${membershipPlan ? `Selected plan: ${membershipPlan} (please confirm pricing and benefits)\n` : ''}Name: ${String(data.get('name')).trim()}\nMy goal: ${data.get('goal')}\nPreferred visit: ${data.get('date') || 'Please help me choose a date'}`);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); }
    catch { const blob = new Blob([message], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'nexus-trial-enquiry.txt'; link.click(); URL.revokeObjectURL(url); }
  };
  return <Modal open={open} onOpenChange={handleOpenChange}>
    <ModalBody labelledBy="trial-title">
      <ModalContent>
        <p className="text-[9px] font-semibold tracking-[.22em] text-neutral-500 dark:text-neutral-400 text-center mb-3">YOUR FIRST STEP</p>
        <h2 id="trial-title" className="text-lg md:text-2xl text-neutral-600 dark:text-neutral-100 font-bold text-center mb-3">
          Make it <span className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 border border-gray-200">happen.</span> ✦
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-8">Prepare your enquiry, then open WhatsApp to send it to the club. Your visit is confirmed by the team.</p>
        {membershipPlan && <p className="text-center text-sm text-neutral-600 dark:text-neutral-300 mb-6">Selected membership: <span className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 border border-gray-200 font-semibold">{membershipPlan}</span> · pricing and benefits to be confirmed.</p>}
        {!message ? <form id="trial-enquiry-form" onSubmit={submit} className="flex flex-col gap-4 w-full max-w-sm mx-auto">
          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[.12em] text-neutral-700 dark:text-neutral-300">
            YOUR NAME
            <input name="name" autoComplete="given-name" placeholder="First name" required maxLength={70} className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal tracking-normal text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[.12em] text-neutral-700 dark:text-neutral-300">
            YOUR GOAL
            <select name="goal" className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal tracking-normal text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
              <option>Build strength</option><option>Improve endurance</option><option>Explore the club</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-[.12em] text-neutral-700 dark:text-neutral-300">
            PREFERRED DATE <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
            <input type="date" name="date" min={localDateKey()} className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal tracking-normal text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
          </label>
        </form> : <div role="status" className="w-full max-w-sm mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3"><Check size={18} className="text-neutral-700 dark:text-neutral-300" /><h3 className="text-base font-bold text-neutral-700 dark:text-neutral-100">Your enquiry is ready.</h3></div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-4">Open WhatsApp and press Send to request your visit. You can also copy the message.</p>
          <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 font-sans text-xs leading-relaxed text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{message}</pre>
        </div>}
      </ModalContent>
      <ModalFooter className="gap-4">
        {message ? <>
          <button onClick={() => handleOpenChange(false)} className="px-2 py-1 bg-gray-200 text-black dark:bg-black dark:border-black dark:text-white border border-gray-300 rounded-md text-sm w-28">Close</button>
          <button onClick={copy} className="bg-black text-white dark:bg-white dark:text-black text-sm px-2 py-1 rounded-md border border-black w-28 inline-flex items-center justify-center gap-1.5"><Copy size={13} />{copied ? 'Copied' : 'Copy'}</button>
          {normalizeRecipient(NEXUS_WHATSAPP_NUMBER) && <a href={`https://wa.me/${normalizeRecipient(NEXUS_WHATSAPP_NUMBER)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-red-600 px-3 py-2 text-sm text-white">Open WhatsApp</a>}
        </> : <>
          <button onClick={() => handleOpenChange(false)} className="px-2 py-1 bg-gray-200 text-black dark:bg-black dark:border-black dark:text-white border border-gray-300 rounded-md text-sm w-28">Cancel</button>
          <button form="trial-enquiry-form" type="submit" className="bg-black text-white dark:bg-white dark:text-black text-sm px-2 py-1 rounded-md border border-black w-28">Prepare</button>
        </>}
      </ModalFooter>
    </ModalBody>
  </Modal>;
}
