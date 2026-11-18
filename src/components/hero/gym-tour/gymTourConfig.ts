export type TourBeat = 'exterior' | 'entry' | 'strength' | 'cardio';
export type TourStatus = 'loading' | 'ready' | 'error';
export type Point = [number, number, number];
export type CameraStop = { at: number; position: Point; target: Point; fov: number };
export const TOUR_BEATS = [
  { id: 'exterior' as TourBeat, label: 'THE ARRIVAL', title: ['BEYOND', 'LIMITS.'], description: 'Your next level starts here. Step inside Nexus Fitness Club, Rajkot.', detail: 'RAJKOT, GUJARAT' },
  { id: 'entry' as TourBeat, label: 'STEP INSIDE', title: ['A PLACE', 'TO BEGIN.'], description: 'Leave the everyday outside. Find the space to become more.', detail: 'WELCOME TO NEXUS' },
  { id: 'strength' as TourBeat, label: 'THE STRENGTH FLOOR', title: ['BUILT BY', 'EFFORT.'], description: 'Make room for progress. Free weights, focused training and your next personal best.', detail: 'STRENGTH · FREE WEIGHTS' },
  { id: 'cardio' as TourBeat, label: 'FIND YOUR RHYTHM', title: ['GO A', 'LITTLE FURTHER.'], description: 'Build your endurance. Find your pace. Start your next chapter with us.', detail: 'CARDIO · CONDITIONING' },
];
// Exterior and interior use separate shots. The brief black transition at .45
// hides the cut, so the camera never travels through an opaque facade.
export const DESKTOP_CAMERAS: CameraStop[] = [
  { at: 0, position: [25, 16, 32], target: [-2, 5, -2], fov: 43 },
  { at: .4, position: [15, 8, 14], target: [5, 5.7, -.5], fov: 43 },
  { at: .45, position: [6, 9, 1], target: [-3, 4.9, -7], fov: 53 },
  { at: .7, position: [3, 8.2, -.8], target: [-4, 4.8, -7.5], fov: 53 },
  { at: 1, position: [-3, 8.2, -.6], target: [4.6, 4.9, -7.4], fov: 53 },
];
export const MOBILE_CAMERAS: CameraStop[] = [
  { at: 0, position: [30, 21, 44], target: [0, 3.2, -2], fov: 54 },
  { at: .4, position: [20, 12, 24], target: [5, 4.7, -.5], fov: 55 },
  { at: .45, position: [7, 13, 2], target: [-2, 3.7, -7], fov: 63 },
  { at: .7, position: [4, 12, 1], target: [-3, 3.8, -7.5], fov: 63 },
  { at: 1, position: [-4, 12, 1], target: [4.5, 3.8, -7.5], fov: 63 },
];
export function tourBeatAt(progress: number): number { return progress < .22 ? 0 : progress < .45 ? 1 : progress < .8 ? 2 : 3; }
export function tourCutOpacity(progress: number): number { return Math.max(0, 1 - Math.abs(progress - .45) / .045); }
/** Writes into supplied arrays so the render loop allocates nothing. */
export function sampleCamera(progress: number, mobile: boolean, position: Point, target: Point): number {
  const stops = mobile ? MOBILE_CAMERAS : DESKTOP_CAMERAS;
  const p = Math.max(0, Math.min(1, progress));
  // Never interpolate the doorway cut: each side is a separate camera shot.
  let a = p < .45 ? stops[0] : stops[2], b = p < .45 ? stops[1] : stops[3];
  if (p >= .7) { a = stops[3]; b = stops[4]; }
  const raw = Math.max(0, Math.min(1, (p - a.at) / (b.at - a.at)));
  const t = raw * raw * (3 - 2 * raw);
  for (let i = 0; i < 3; i++) { position[i] = a.position[i] + (b.position[i] - a.position[i]) * t; target[i] = a.target[i] + (b.target[i] - a.target[i]) * t; }
  return a.fov + (b.fov - a.fov) * t;
}

/** Finish small FOV changes exactly so a demand renderer always becomes idle. */
export function settleTourFov(current: number, target: number, alpha: number): number {
  return Math.abs(target - current) > .01 ? current + (target - current) * alpha : target;
}
