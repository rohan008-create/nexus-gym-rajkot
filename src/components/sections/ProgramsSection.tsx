'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { Program, programs } from './programs';

function ProgramDetails({ program, onClose, onTrial }: { program: Program | null; onClose: () => void; onTrial: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (program) dialog.current?.showModal(); else dialog.current?.close(); }, [program]);
  return <dialog ref={dialog} className="program-dialog" aria-labelledby="program-detail-title" onCancel={onClose} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <button className="dialog-close" aria-label="Close program details" onClick={onClose}><X size={21} /></button>
    {program && <><img className="program-dialog-image" src={program.image} alt={program.alt} width="768" height="1152" /><div className="program-dialog-copy"><p className="eyebrow">EXPLORE YOUR POTENTIAL · {program.number}</p><h2 id="program-detail-title">{program.title}</h2><p>{program.description}</p><h3>Training focus</h3><ul>{program.focus.map(item => <li key={item}>{item}</li>)}</ul><p className="program-disclaimer">Proposed training category. Availability and details will be confirmed by the club. Imagery is illustrative.</p><button className="primary-cta" onClick={() => { dialog.current?.close(); onClose(); onTrial(); }}>Enquire about this program <ArrowUpRight size={17} /></button></div></>}
  </dialog>;
}
export default function ProgramsSection({ onTrial }: { onTrial: () => void }) {
  const [active, setActive] = useState(1), [detail, setDetail] = useState<Program | null>(null);
  const select = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!matchMedia('(max-width: 719px)').matches) return;
    const card = select.current[1]?.closest('article'), container = card?.parentElement;
    if (card && container) container.scrollLeft += card.getBoundingClientRect().left - container.getBoundingClientRect().left - 24;
  }, []);
  return <section id="programs" className="programs-section" aria-labelledby="programs-title">
    <div className="programs-light-sweep" aria-hidden />
    <header className="programs-heading"><div><p className="eyebrow"><span aria-hidden />OUR PROGRAMS</p><h2 id="programs-title"><span>CHOOSE YOUR</span><em>STRENGTH.</em></h2></div><p className="programs-description">Explore training experiences designed to help you build strength, improve endurance, and reach your fitness goals.</p></header>
    <div className="program-panels" aria-label="Explore training categories">
      {programs.map((program, index) => <article key={program.id} className={`program-panel ${active === index ? 'is-active' : ''}`} data-program={program.id} onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(index); }}>
        <img src={program.image} alt={program.alt} width="768" height="1152" loading="lazy" decoding="async" />
        <div className="program-panel-shade" aria-hidden />
        <button ref={button => { select.current[index] = button; }} className="program-select" aria-label={`Select ${program.title}`} aria-expanded={active === index} aria-controls={`program-content-${program.id}`} onClick={() => setActive(index)} onFocus={() => setActive(index)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + programs.length) % programs.length; setActive(next); select.current[next]?.focus(); } }} />
        <div className="program-panel-title"><span>{program.number}<i>/</i></span><h3>{program.title}</h3></div>
        <div className="program-panel-content" id={`program-content-${program.id}`} aria-hidden={active !== index}>
          <p>{program.description}</p>
          {active === index && <button className="program-explore" onClick={() => setDetail(program)}>EXPLORE PROGRAM <ArrowRight size={15} aria-hidden /></button>}
        </div>
        <button className="program-arrow" aria-label={`View ${program.title} details`} onClick={() => { setActive(index); setDetail(program); }}><ArrowUpRight size={19} aria-hidden /></button>
      </article>)}
    </div>
    <div className="programs-bottom"><p>Proposed training categories · Illustrative photography</p><div className="program-dots" aria-label="Select featured program">{programs.map((program, index) => <button key={program.id} aria-label={`Feature ${program.title}`} aria-pressed={active === index} onClick={() => { setActive(index); select.current[index]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }} />)}</div></div>
    <ProgramDetails program={detail} onClose={() => setDetail(null)} onTrial={onTrial} />
  </section>;
}
