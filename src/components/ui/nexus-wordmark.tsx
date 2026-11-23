'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import './nexus-wordmark.css';

type Row = readonly number[];

const letters: { name: string; rows: Row[] }[] = [
  { name: 'N', rows: [
    [0, 6, 18, 24], [0, 8, 18, 24], [0, 10, 18, 24], [0, 12, 18, 24],
    [0, 6, 8, 14, 18, 24], [0, 6, 10, 16, 18, 24], [0, 6, 12, 24],
    [0, 6, 14, 24], [0, 6, 16, 24], [0, 6, 18, 24],
  ] },
  { name: 'E', rows: [
    [0, 24], [0, 24], [0, 6], [0, 6], [0, 20], [0, 20],
    [0, 6], [0, 6], [0, 24], [0, 24],
  ] },
  { name: 'X', rows: [
    [0, 7, 17, 24], [2, 9, 15, 22], [4, 11, 13, 20], [6, 18], [8, 16],
    [8, 16], [6, 18], [4, 11, 13, 20], [2, 9, 15, 22], [0, 7, 17, 24],
  ] },
  { name: 'U', rows: [
    [0, 6, 18, 24], [0, 6, 18, 24], [0, 6, 18, 24], [0, 6, 18, 24],
    [0, 6, 18, 24], [0, 6, 18, 24], [0, 6, 18, 24], [0, 7, 17, 24],
    [1, 23], [4, 20],
  ] },
  { name: 'S', rows: [
    [4, 23], [1, 24], [0, 6], [0, 7], [2, 21], [5, 23],
    [17, 24], [18, 24], [0, 23], [1, 20],
  ] },
];

// Pentatonic intervals shape the pitches from the bottom row to the top.
const pitches = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];

export default function NexusWordmark() {
  const audio = useRef<AudioContext | null>(null);
  const active = useRef<SVGRectElement | null>(null);
  const release = useRef<number | undefined>(undefined);
  const lastNote = useRef(-Infinity);

  useEffect(() => () => {
    window.clearTimeout(release.current);
    if (audio.current) void audio.current.close().catch(() => {});
  }, []);

  async function play(segment: SVGRectElement, gesture = false) {
    if (!window.AudioContext) return;
    if (!audio.current && !gesture) return;

    const context = audio.current ??= new AudioContext();
    if (context.state === 'suspended') {
      if (!gesture) return;
      await context.resume();
    }
    if (context.state !== 'running' || active.current !== segment) return;

    const now = context.currentTime;
    if (now - lastNote.current < .025) return;
    lastNote.current = now;

    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'triangle';
    tone.frequency.value = 440 * 2 ** ((Number(segment.dataset.note) - 69) / 12);
    gain.gain.setValueAtTime(.001, now);
    gain.gain.exponentialRampToValueAtTime(.12, now + .012);
    gain.gain.exponentialRampToValueAtTime(.001, now + .24);
    tone.connect(gain).connect(context.destination);
    tone.start(now);
    tone.stop(now + .25);
  }

  function highlight(segment: SVGRectElement | null, gesture = false) {
    window.clearTimeout(release.current);
    if (active.current !== segment) {
      active.current?.removeAttribute('data-active');
      active.current = segment;
      segment?.setAttribute('data-active', '');
    } else if (!gesture) return;

    if (segment) void play(segment, gesture).catch(() => {});
  }

  function hit(event: PointerEvent<HTMLDivElement>, findUnderPointer = false, allowLetter = false) {
    const target = findUnderPointer ? document.elementFromPoint(event.clientX, event.clientY) : event.target;
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return null;
    if (target instanceof SVGRectElement && target.hasAttribute('data-note')) return target;
    return allowLetter ? target.closest('button')?.querySelector<SVGRectElement>('[data-note]') ?? null : null;
  }

  function releaseSoon() {
    window.clearTimeout(release.current);
    release.current = window.setTimeout(() => highlight(null), 180);
  }

  return (
    <div className="nexus-wordmark-stage" role="group" aria-label="NEXUS interactive wordmark"
      data-testid="nexus-wordmark"
      onPointerMove={event => highlight(hit(event, event.pointerType !== 'mouse'))}
      onPointerDown={event => {
        if (event.button === 0) highlight(hit(event, false, true), true);
      }}
      onPointerUp={event => {
        if (event.pointerType === 'mouse') return;
        if (audio.current?.state !== 'running' && active.current) highlight(active.current, true);
        releaseSoon();
      }}
      onPointerCancel={() => highlight(null)}
      onPointerLeave={event => {
        if (event.pointerType === 'mouse') highlight(null);
      }}>
      {letters.map(({ name, rows }, letterIndex) => (
        <button key={name} type="button" className="nexus-wordmark-letter" aria-label={`Play ${name}`}
          onClick={event => {
            if (event.detail !== 0) return;
            highlight(event.currentTarget.querySelector('[data-note]'), true);
            releaseSoon();
          }}>
          <svg viewBox="0 0 24 19.45" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {rows.flatMap((row, rowIndex) => row.map((start, index) => index % 2 === 0 && (
              <rect key={`${rowIndex}-${start}`} x={start} y={rowIndex * 2} width={row[index + 1] - start}
                height={1.45} rx={.16} data-note={45 + pitches[9 - rowIndex] + letterIndex * 3 + index / 2} />
            )))}
          </svg>
        </button>
      ))}
    </div>
  );
}
