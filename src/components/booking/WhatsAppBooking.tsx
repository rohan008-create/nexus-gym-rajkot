'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, MessageCircle, CalendarDays, ArrowRight, Compass, Dumbbell, Crown, Sparkles, ShieldCheck } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bookingExperiences, BookingErrors, bookingSteps, BookingValues, fitnessGoals, preferredTimes } from './bookingConfig';
import { formatBookingDate, localDateKey, validateBooking } from './bookingUtils';
import BookingCalendar from './BookingCalendar';
import BookingReview from './BookingReview';
import { useReducedMotion } from '../../hooks/useBagAnimation';
import './whatsAppBooking.css';

const titles = ['What brings you here?', 'Find a day that fits.', 'A little about you.', 'Your next chapter awaits.'];
const descriptions = ['One choice. A new direction.', 'Choose a preference. We’ll confirm the details.', 'A few details to make the conversation yours.', 'Review your enquiry before opening WhatsApp.'];

const experienceIcons: Record<string, typeof Compass> = {
  visit: Compass,
  trial: Dumbbell,
  membership: Crown,
};

export default function WhatsAppBooking() {
  const root = useRef<HTMLElement>(null), body = useRef<HTMLDivElement>(null), content = useRef<HTMLFormElement>(null), heading = useRef<HTMLHeadingElement>(null), errorSummary = useRef<HTMLDivElement>(null);
  const transition = useRef<gsap.core.Tween | null>(null), oldHeight = useRef(0), needsFocus = useRef(false);
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [today, setToday] = useState(() => localDateKey());
  const [values, setValues] = useState<BookingValues>({ experience: 'visit', date: '', time: '', name: '', mobile: '', goal: '' });
  const [errors, setErrors] = useState<BookingErrors>({});
  const reduced = useReducedMotion();
  const update = useCallback((key: keyof BookingValues, value: string) => { setValues(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })); }, []);
  useEffect(() => { const timer = setInterval(() => setToday(localDateKey()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => () => { transition.current?.kill(); }, []);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const find = gsap.utils.selector(root);
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 85%', toggleActions: 'play none none reverse' } })
        .fromTo(find('.booking-eyebrow'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .4 }, 0)
        .fromTo(find('.booking-story h2 > span'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .08, ease: 'power3.out' }, .08)
        .fromTo(find('.booking-story-description'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45 }, .3)
        .fromTo(find('.booking-panel'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .6 }, .2);
    }, root);
    return () => media.revert();
  }, []);
  useLayoutEffect(() => {
    if (!body.current || !content.current) return;
    const wrapper = body.current, pane = content.current;
    const complete = () => {
      wrapper.style.height = 'auto'; setBusy(false);
      if (needsFocus.current) {
        needsFocus.current = false; heading.current?.focus({ preventScroll: true });
        const rect = heading.current?.getBoundingClientRect();
        if (rect && (rect.top < 98 || rect.top > innerHeight - 100)) window.scrollTo({ top: rect.top + scrollY - 110, behavior: reduced ? 'auto' : 'smooth' });
        // This section is unpinned. Refresh only after a deliberate step/height
        // change, without moving any existing stage's internal playhead.
        ScrollTrigger.refresh();
      }
    };
    const context = gsap.context(() => {
      if (reduced || !oldHeight.current) { gsap.set(pane, { opacity: 1, y: 0 }); complete(); return; }
      gsap.fromTo(wrapper, { height: oldHeight.current }, { height: pane.offsetHeight, duration: .28, ease: 'power2.inOut', onComplete: complete });
      gsap.fromTo(pane, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .25, delay: .06, ease: 'power2.out' });
    }, root);
    return () => context.revert();
  }, [step, reduced]);
  const go = (next: number) => {
    if (busy || next === step) return;
    oldHeight.current = content.current?.offsetHeight || 0; needsFocus.current = true; setBusy(true); setErrors({});
    if (reduced || !content.current) { setStep(next); return; }
    transition.current?.kill(); transition.current = gsap.to(content.current, { opacity: 0, y: -8, duration: .13, ease: 'power2.in', onComplete: () => setStep(next) });
  };
  const showErrors = (nextErrors: BookingErrors) => { setErrors(nextErrors); requestAnimationFrame(() => errorSummary.current?.focus()); };
  const continueStep = (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    const nextErrors = validateBooking(values, step + 1);
    if (Object.keys(nextErrors).length) { showErrors(nextErrors); return; }
    if (step < 3) go(step + 1);
  };
  const validateFinal = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const nextErrors = validateBooking(values, 3);
    if (Object.keys(nextErrors).length) { event.preventDefault(); const next = nextErrors.experience ? 0 : nextErrors.date || nextErrors.time ? 1 : 2; go(next); setTimeout(() => showErrors(nextErrors), reduced ? 0 : 180); }
  };
  const selectedExperience = bookingExperiences.find(item => item.id === values.experience) || bookingExperiences[0];
  const visibleErrors = Object.values(errors).filter(Boolean);
  return <section ref={root} className="booking-section" id="booking" aria-labelledby="booking-section-title" data-booking-step={step + 1}>
    <div className="booking-composition">
      <div className="booking-topline">
        <span>09 / RESERVATIONS & VISITS</span>
        <span>NEXUS ATHLETIC CLUB · RAJKOT</span>
      </div>
      <header className="booking-story">
        <p className="booking-eyebrow"><span aria-hidden />A DEFINITIVE STEP FORWARD</p>
        <h2 id="booking-section-title"><span>MAKE YOUR</span><span className="accent">NEXT MOVE.</span></h2>
        <p className="booking-story-description">Every great transformation begins with a single decision. Reserve your private walkthrough, high-intensity trial, or membership consultation with our master trainers.</p>
      </header>
      <div className="booking-workspace">
      <aside className="booking-editorial" aria-label="Your Nexus experience">
        <div className="booking-editorial-frame">
          <span className="booking-backdrop-word" aria-hidden>NEXUS.</span>
          <div className="booking-editorial-header">
            <span className="booking-edition-tag">EDITION 09 // ACCESS PASS</span>
            <span className="booking-status-indicator"><span className="booking-pulse-dot" aria-hidden />LIVE RESERVATION</span>
          </div>
          <div className="booking-editorial-image">
            <img key={values.experience} src={`/assets/photography/${values.experience === 'trial' ? 'program-strength' : values.experience === 'membership' ? 'program-personal' : 'about-gym'}.webp`} alt={values.experience === 'visit' ? 'A gym interior with strength training equipment' : values.experience === 'trial' ? 'Strength training inspiration' : 'Personal training inspiration'} loading="lazy" />
            <div className="booking-image-gradient" aria-hidden />
            <span className="booking-photo-mark" aria-hidden>N.</span>
          </div>
          <div className="booking-editorial-docket">
            <div className="booking-docket-row">
              <span className="booking-docket-label">SELECTED TIER</span>
              <strong className="booking-docket-value">{selectedExperience.title}</strong>
            </div>
            {values.date && (
              <div className="booking-docket-row">
                <span className="booking-docket-label">SCHEDULE</span>
                <span className="booking-docket-schedule">
                  <CalendarDays size={12} aria-hidden />
                  {formatBookingDate(values.date)}{values.time && ` @ ${values.time}`}
                </span>
              </div>
            )}
            <div className="booking-docket-footer">
              <span>LOCATION: 150FT RING ROAD · RAJKOT</span>
              <span>CONFIRMATION: DIRECT WHATSAPP</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="booking-panel">
      <nav className="booking-step-nav" aria-label="Enquiry progress">
        <ol className="booking-progress" aria-label="Booking steps">{bookingSteps.map((name, index) => <li key={name} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}><button type="button" disabled={index > step || busy} onClick={() => go(index)} aria-current={index === step ? 'step' : undefined} aria-label={`${index + 1}. ${name}${index < step ? ', completed, edit' : ''}`}><span className="booking-step-number">{index < step ? <Check size={13} aria-hidden /> : String(index + 1).padStart(2, '0')}</span><span>{name}</span></button></li>)}</ol>
      </nav>
        <div ref={body} className={`booking-step-body${busy ? ' is-transitioning' : ''}`}><form onSubmit={continueStep} noValidate ref={content} className="booking-step-content" key={step} aria-busy={busy}>
          <p className="booking-step-count"><span>STEP {String(step + 1).padStart(2, '0')} / 04</span><span>{step === 3 ? 'READY WHEN YOU ARE' : 'YOUR JOURNEY, YOUR PACE'}</span></p><h3 ref={heading} tabIndex={-1} id="booking-step-title">{titles[step]}</h3><p className="booking-step-description">{descriptions[step]}</p>
          {!!visibleErrors.length && <div className="booking-error-summary" ref={errorSummary} role="alert" tabIndex={-1}>{visibleErrors.map(text => <p key={text}>{text}</p>)}</div>}
          {step === 0 && <fieldset className="booking-experiences"><legend className="sr-only">Choose your experience</legend>{bookingExperiences.map((item, index) => { const Icon = experienceIcons[item.id] || Sparkles; return <label key={item.id} className={`booking-experience${values.experience === item.id ? ' is-selected' : ''}`}><input type="radio" name="experience" value={item.id} checked={values.experience === item.id} onChange={() => update('experience', item.id)} /><div className="booking-experience-lead"><span className="booking-experience-number" aria-hidden>0{index + 1}</span><span className="booking-experience-icon" aria-hidden><Icon size={18} /></span></div><span className="booking-experience-copy"><strong>{item.title}</strong><span>{item.description}</span></span><span className="booking-choice-check" aria-hidden>{values.experience === item.id && <Check size={13} />}</span></label>; })}</fieldset>}
          {step === 1 && <><BookingCalendar selected={values.date} todayKey={today} error={errors.date} onSelect={date => update('date', date)} /><fieldset className="booking-times"><legend>PREFERRED TIME</legend><div>{preferredTimes.map(time => <label key={time} className={values.time === time ? 'is-selected' : ''}><input type="radio" name="time" value={time} checked={values.time === time} onChange={() => update('time', time)} /><span>{time}</span>{values.time === time && <Check size={11} aria-hidden />}</label>)}</div>{errors.time && <p className="booking-error">{errors.time}</p>}</fieldset><p className="booking-preference-note">Your preferred date and time are subject to confirmation by our team.</p></>}
          {step === 2 && <div className="booking-personal-details"><label className="booking-field">Full name <span aria-hidden>*</span><input name="fullName" autoComplete="name" value={values.name} onChange={event => update('name', event.target.value)} placeholder="Your full name" maxLength={80} required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'booking-name-error' : undefined} /></label>{errors.name && <p className="booking-error" id="booking-name-error">{errors.name}</p>}<label className="booking-field">Mobile number <span aria-hidden>*</span><input type="tel" inputMode="tel" name="mobile" autoComplete="tel" value={values.mobile} onChange={event => update('mobile', event.target.value)} placeholder="Mobile number or +country code" maxLength={30} required aria-invalid={!!errors.mobile} aria-describedby={errors.mobile ? 'booking-mobile-error' : 'booking-mobile-help'} /></label><p className="booking-field-help" id="booking-mobile-help">Indian mobile numbers or international numbers with country code.</p>{errors.mobile && <p className="booking-error" id="booking-mobile-error">{errors.mobile}</p>}<fieldset className="booking-goals"><legend>FITNESS GOAL <span>(OPTIONAL)</span></legend><div>{fitnessGoals.map(goal => <label key={goal} className={values.goal === goal ? 'is-selected' : ''}><input type="radio" name="fitnessGoal" value={goal} checked={values.goal === goal} onChange={() => update('goal', goal)} /><span>{goal}</span></label>)}</div>{values.goal && <button type="button" onClick={() => update('goal', '')}>Clear goal</button>}</fieldset><p className="booking-privacy">Your details will be included in the WhatsApp message you choose to send.</p></div>}
          {step === 3 && <BookingReview values={values} onEdit={go} onValidate={validateFinal} />}
          <div className="booking-step-actions">{step > 0 ? <button type="button" className="booking-back" disabled={busy} onClick={() => go(step - 1)}><ArrowLeft size={15} aria-hidden />BACK</button> : <span className="booking-action-note">Your next chapter.<br />One step at a time.</span>}{step < 3 && <button className="booking-continue" type="submit" disabled={busy}>CONTINUE <ArrowRight size={17} aria-hidden /></button>}</div>
        </form></div>
      </div>
      </div>
      <footer className="booking-section-footer"><span>NEXUS FITNESS CLUB · RAJKOT</span><span><MessageCircle size={14} aria-hidden /> A conversation with our team, on WhatsApp.</span></footer>
    </div>
  </section>;
}
