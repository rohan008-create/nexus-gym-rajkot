'use client';

import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import TactileHighlight from '../../ui/tactile-highlight';
import { TOUR_CHAPTERS, TOUR_MARKER_SPACING } from './gymTourConfig';

export function ArrivalWordmark() {
  return <>Nexus <span>Fitness Club</span></>;
}

function Copy({ chapter }: { chapter: typeof TOUR_CHAPTERS[number] }) {
  const isPresent = useIsPresent();
  const arrival = chapter.id === 'arrival';

  return <motion.div className="gym-tour-chapter" data-chapter={chapter.id} aria-hidden={!isPresent}
    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }}
    transition={{ duration: .33, ease: [.22, 1, .36, 1] }}>
    <span className="gym-tour-chapter-label">{chapter.label}</span>
    <h2 className={arrival ? 'gym-tour-chapter-title gym-tour-arrival-title' : 'gym-tour-chapter-title'}>
      {arrival ? <ArrivalWordmark /> : <>{chapter.lead}<br /><TactileHighlight>{chapter.highlight}</TactileHighlight></>}
    </h2>
    {chapter.id === 'reception'
      ? <q className="gym-tour-chapter-description">{chapter.description}</q>
      : <p className="gym-tour-chapter-description">{chapter.description}</p>}
  </motion.div>;
}

export default function TourChapterCopy({ chapterIndex }: { chapterIndex: number }) {
  const chapter = TOUR_CHAPTERS[chapterIndex];

  return <div className="gym-tour-story">
    <div className="gym-tour-chapter-stack">
      <AnimatePresence initial={false}><Copy key={chapter.id} chapter={chapter} /></AnimatePresence>
    </div>
    <ol className="gym-tour-story-progress" aria-label="Tour chapters">
      {TOUR_CHAPTERS.map(({ id }, index) => {
        const name = id[0].toUpperCase() + id.slice(1);

        return <li key={id} className="gym-tour-progress-marker" tabIndex={0}
          aria-label={name} aria-current={index === chapterIndex ? 'step' : undefined}
          style={{ left: `${index * TOUR_MARKER_SPACING * 100}%` }}>
          <span aria-hidden="true" className="gym-tour-progress-label">{name}</span>
        </li>;
      })}
    </ol>
  </div>;
}
