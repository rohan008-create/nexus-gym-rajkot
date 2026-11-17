export const evolutionChapters = [
  { id: 'beginning', number: '01', rail: 'Beginning', eyebrow: 'THE BEGINNING', lines: ['EVERY', 'EVOLUTION', 'STARTS HERE.'], description: 'One decision can begin a different journey.', start: 0, sourceStart: 0 },
  { id: 'anatomy', number: '02', rail: 'Anatomy', eyebrow: 'LOOK WITHIN', lines: ['BEYOND', 'THE SURFACE.'], description: 'Discover the systems behind human movement.', start: .22, sourceStart: .22 },
  { id: 'training', number: '03', rail: 'Training', eyebrow: 'THE WORK', lines: ['STRENGTH', 'IS BUILT.'], description: 'Progress is shaped by consistent training over time.', start: .5, sourceStart: .5 },
  { id: 'evolution', number: '04', rail: 'Evolution', eyebrow: 'THE EVOLUTION', lines: ['YOUR', 'EVOLUTION', 'STARTS HERE.'], description: 'Build your next chapter at NEXUS FITNESS CLUB.', start: .78, sourceStart: .91 },
] as const;

// The supplied footage stays anatomical until ~9 seconds. Give the actual
// final skin/athletic reveal a full last chapter rather than mistiming its copy.
export function sourceProgress(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const chapter = [...evolutionChapters].reverse().find(item => p >= item.start)!;
  const index = evolutionChapters.indexOf(chapter);
  const next = evolutionChapters[index + 1];
  return chapter.sourceStart + (p - chapter.start) / ((next?.start ?? 1) - chapter.start) * ((next?.sourceStart ?? 1) - chapter.sourceStart);
}

// Coordinates measured against the union subject bounds after inspecting the
// source at 2.7s, 3.7s, 6.2s and 7.6s. No labels are placed on absent feet.
export const anatomyCallouts = [
  { id: 'skeletal', from: 2.7, to: 5.5, label: 'SKELETAL SYSTEM', x: .5, y: .14, side: 1 },
  { id: 'muscular', from: 3.1, to: 5.7, label: 'MUSCULAR SYSTEM', x: .28, y: .36, side: -1 },
  { id: 'core', from: 5.95, to: 6.65, label: 'CORE — PLANK', x: .5, y: .57, side: 1 },
  { id: 'legs', from: 7.35, to: 8.15, label: 'LEGS — SQUAT', x: .57, y: .91, side: 1 },
] as const;
