'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import EvolutionCanvas, { CanvasHandle, EvolutionManifest } from './EvolutionCanvas';
import { evolutionChapters, sourceProgress } from './evolutionChapters';
import './humanEvolution.css';

export default function HumanEvolution({ onJourney }: { onJourney: () => void }) {
  const root = useRef<HTMLElement>(null);
  const visual = useRef<CanvasHandle>(null);
  const scroll = useRef<ScrollTrigger | null>(null);
  const [manifest, setManifest] = useState<EvolutionManifest | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [status, setStatus] = useState('loading');
  const progress = useRef(0);
  const frameCount = useRef(239);
  frameCount.current = manifest?.frameCount || 239;
  const ready = useCallback(() => setStatus('ready'), []);
  const unavailable = useCallback(() => setStatus('error'), []);
  useEffect(() => {
    const controller = new AbortController(); let alive = true;
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      void fetch('/animations/nexus-evolution/manifest.json', { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Sequence unavailable'); return response.json(); }).then(data => { if (alive) setManifest(data); }).catch(() => { if (alive && !controller.signal.aborted) unavailable(); });
    }, { rootMargin: '3600px' });
    const visibility = new IntersectionObserver(([entry]) => visual.current?.pause(!entry.isIntersecting));
    if (root.current) { near.observe(root.current); visibility.observe(root.current); }
    const tab = () => { visual.current?.pause(document.hidden); if (!document.hidden) visual.current?.seek(sourceProgress(progress.current) * (frameCount.current - 1)); };
    document.addEventListener('visibilitychange', tab);
    return () => { alive = false; controller.abort(); near.disconnect(); visibility.disconnect(); document.removeEventListener('visibilitychange', tab); };
  }, [unavailable]);
  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', () => {
      const stage = section.querySelector<HTMLElement>('.evolution-stage')!;
      const articles = Array.from(section.querySelectorAll<HTMLElement>('.evolution-chapter'));
      setEnhanced(true); section.classList.add('evolution-is-enhanced');
      gsap.set(articles, { autoAlpha: 0 }); gsap.set(articles[0], { autoAlpha: 1 });
      const state = { p: 0 }; let lastChapter = -1, lastPercent = -1;
      const timeline = gsap.timeline({ scrollTrigger: { id: 'nexus-evolution', trigger: stage, start: 'top top', end: () => `+=${Math.round(innerHeight * (innerWidth < 720 ? 3.5 : 4))}`, pin: true, pinSpacing: true, scrub: innerWidth < 720 ? .85 : .7, anticipatePin: 1, invalidateOnRefresh: true } });
      scroll.current = timeline.scrollTrigger!;
      timeline.to(state, { p: 1, duration: 1, ease: 'none', onUpdate: () => {
        const p = state.p; progress.current = p;
        section.style.setProperty('--journey-progress', String(p));
        visual.current?.seek(sourceProgress(p) * (frameCount.current - 1));
        const index = p < .22 ? 0 : p < .5 ? 1 : p < .78 ? 2 : 3;
        if (lastChapter !== index) { lastChapter = index; setChapter(index); }
        const percent = Math.round(p * 100);
        if (percent !== lastPercent) { lastPercent = percent; section.querySelector('[role=progressbar]')?.setAttribute('aria-valuenow', String(percent)); }
      } }, 0);
      articles.forEach((article, index) => {
        const start = evolutionChapters[index].start;
        if (index > 0) timeline.fromTo(article, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .035 }, start);
        timeline.fromTo(article.querySelectorAll('.evolution-title-line > span'), { yPercent: 105 }, { yPercent: 0, duration: .045, stagger: .008 }, start);
        if (index < 3) timeline.to(article, { autoAlpha: 0, y: -8, duration: .025 }, evolutionChapters[index + 1].start - .035);
      });
      timeline.fromTo(section.querySelector('.evolution-scan'), { yPercent: -100, opacity: 0 }, { yPercent: 100, opacity: .35, duration: .2 }, .24)
        .to(section.querySelector('.evolution-scan'), { opacity: 0, duration: .04 }, .44)
        .fromTo(section.querySelector('.evolution-x'), { opacity: 0, scale: .92 }, { opacity: .5, scale: 1, duration: .18 }, .78);
      return () => { section.classList.remove('evolution-is-enhanced'); section.style.removeProperty('--journey-progress'); scroll.current = null; setEnhanced(false); setChapter(0); progress.current = 0; visual.current?.seek(0); };
    }, section);
    return () => media.revert();
  }, []);
  useEffect(() => { if (manifest) visual.current?.seek(sourceProgress(progress.current) * (manifest.frameCount - 1)); }, [manifest]);
  const navigate = (index: number) => {
    if (scroll.current) {
      const p = index === 0 ? .08 : evolutionChapters[index].start + .09;
      window.scrollTo({ top: scroll.current.start + (scroll.current.end - scroll.current.start) * p, behavior: 'smooth' });
    } else {
      setChapter(index);
      const representative = [.08, .34, .58, .96][index];
      visual.current?.seek(Math.round(sourceProgress(representative) * ((manifest?.frameCount || 239) - 1)));
      root.current?.querySelector(`#evolution-${evolutionChapters[index].id}`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };
  return <section ref={root} className="evolution-section" id="human-evolution" aria-labelledby="evolution-heading" data-evolution-status={status} data-evolution-chapter={evolutionChapters[chapter].id}>
    <div className="evolution-stage">
      <div className="evolution-background" aria-hidden><span className="evolution-ring evolution-ring-one" /><span className="evolution-ring evolution-ring-two" /><span className="evolution-x" /><span className="evolution-scan" /></div>
      <header className="evolution-header"><p>08 / THE HUMAN EVOLUTION</p><h2 id="evolution-heading" className="sr-only">The Human Evolution</h2><a href="#evolution-transcript" onClick={() => { const transcript = root.current?.querySelector<HTMLDetailsElement>('.evolution-transcript'); if (transcript) transcript.open = true; }}>Read the journey <ArrowDown size={12} aria-hidden /></a></header>
      {manifest && <EvolutionCanvas ref={visual} manifest={manifest} onReady={ready} onError={unavailable} />}
      {status !== 'ready' && <div className="evolution-poster"><picture><source media="(max-width: 719px)" srcSet="/animations/nexus-evolution/mobile/frame-0001.webp" /><img src="/animations/nexus-evolution/poster.webp" alt="Illustrative adult male at the beginning of the transformation, shown in the source's head-to-thigh framing" loading="lazy" width={1280} height={720} /></picture><span role="status">{status === 'error' ? 'Animation unavailable. Read the journey below.' : 'Preparing the journey…'}</span></div>}
      <div className="evolution-chapters">{evolutionChapters.map((item, index) => <article className="evolution-chapter" id={`evolution-${item.id}`} key={item.id} aria-hidden={enhanced ? chapter !== index : undefined}>
        <p className="evolution-chapter-eyebrow">{item.number} / {item.eyebrow}</p><h3>{item.lines.map((line, i) => <span key={line} className={`evolution-title-line${i === 1 ? ' accent' : ''}`}><span>{line}</span></span>)}</h3><p className="evolution-description">{item.description}</p><span className="evolution-accent-rule" aria-hidden />
        {index === 3 && <button className="primary-cta evolution-cta" tabIndex={enhanced && chapter !== 3 ? -1 : 0} onClick={onJourney}>START YOUR JOURNEY<ArrowUpRight size={18} aria-hidden /></button>}
      </article>)}</div>
      <nav className="evolution-progress" aria-label="Evolution chapters"><div className="evolution-progress-track" role="progressbar" aria-label="Transformation journey" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><span /></div>{evolutionChapters.map((item, i) => <button type="button" key={item.id} onClick={() => navigate(i)} aria-label={`Go to ${item.rail} chapter`} aria-current={chapter === i ? 'step' : undefined}><span>{item.number}</span><span>{item.rail}</span></button>)}</nav>
      <p className="evolution-source-note">AI VISUALISATION</p>
    </div>
    <details className="evolution-transcript" id="evolution-transcript"><summary>Read the four-chapter journey without animation</summary><ol>{evolutionChapters.map(item => <li key={item.id}><h3>{item.number} / {item.eyebrow}</h3><p>{item.lines.join(' ')} {item.description}</p></li>)}</ol><p>The source shows an illustrative skeleton and muscles, followed by core and thigh highlights. Planks and squats are educational examples of muscle involvement, not promises of a particular transformation. The supplied footage ends at the thighs; no feet are present.</p><button className="primary-cta" onClick={onJourney}>START YOUR JOURNEY<ArrowUpRight size={17} aria-hidden /></button></details>
  </section>;
}
