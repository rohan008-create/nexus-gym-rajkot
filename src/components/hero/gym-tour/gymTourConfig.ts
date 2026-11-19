export type TourBeat = 'exterior' | 'entry' | 'strength' | 'cardio';
export type TourStatus = 'loading' | 'ready' | 'error';
export type Point = [number, number, number];
export type CameraStop = { at: number; position: Point; target: Point; fov: number };
export const TOUR_BEATS = [
  { id: 'exterior' as TourBeat, label: 'THE ARRIVAL', title: ['WELCOME TO', 'NEXUS.'], description: 'Meet Ryan. Your journey starts at the steps.', detail: 'RAJKOT, GUJARAT' },
  { id: 'entry' as TourBeat, label: 'COME ON IN', title: ['YOUR NEXT', 'LEVEL.'], description: 'Follow Ryan up the stairs and into Nexus.', detail: 'WELCOME TO NEXUS' },
  { id: 'strength' as TourBeat, label: 'THE STRENGTH FLOOR', title: ['BUILT BY', 'EFFORT.'], description: 'Free weights, focused training and your next personal best.', detail: 'STRENGTH · FREE WEIGHTS' },
  { id: 'cardio' as TourBeat, label: 'FIND YOUR RHYTHM', title: ['GO A', 'LITTLE FURTHER.'], description: 'Build your endurance. Find your pace.', detail: 'CARDIO · CONDITIONING' },
];

// One continuous eye-level route. Coordinates: metres, Y up, +Z street.
export const DESKTOP_CAMERAS: CameraStop[] = [
  { at: 0, position: [3, 10.5, 33], target: [1, 7.15, -1], fov: 40 },
  { at: .12, position: [10.67, 3.2, 14.9], target: [8.05, 1.3, 8.6], fov: 46 },
  { at: .18, position: [8.05, 2.1, 11.6], target: [8.05, 1.6, 7.7], fov: 49 },
  { at: .52, position: [8.05, 5.9, 4.3], target: [8.05, 5.8, 1.7], fov: 52 },
  { at: .6, position: [8.05, 6.05, 3.4], target: [8.05, 5.7, .2], fov: 54 },
  { at: .66, position: [8.05, 6.05, 2.45], target: [8.05, 5.7, -1.7], fov: 54 },
  { at: .74, position: [8.05, 6.06, -.65], target: [5.9, 5.4, -3.6], fov: 58 },
  { at: .82, position: [5.15, 6.06, -.76], target: [6.82, 5.56, -2.65], fov: 67 },
  { at: .86, position: [4.75, 6.06, -.9], target: [6.82, 5.56, -2.65], fov: 65 },
  { at: .88, position: [4.58, 6.08, -1.52], target: [2.15, 5.8, -1.6], fov: 65 },
  { at: .92, position: [1.05, 6.1, -2.4], target: [-3.5, 5.3, -7.5], fov: 60 },
  { at: 1, position: [.6, 6.12, -4.2], target: [4.2, 5.4, -7.2], fov: 60 },
];
export const MOBILE_CAMERAS: CameraStop[] = DESKTOP_CAMERAS.map(stop => ({
  ...stop, position: [...stop.position] as Point, target: [...stop.target] as Point,
  fov: stop.at === 0 ? 60 : Math.min(68, stop.fov + 8),
}));
MOBILE_CAMERAS[0] = { at: 0, position: [3, 12.5, 42], target: [1.1, 7.5, 0], fov: 60 };

export const DOORWAY = .74;
export const STAIR = { x: 8.05, bottomZ: 8.8, run: .355, rise: .21, count: 20, landingY: 4.51 };
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
export function stairHeight(index: number) {
  return index < 0 ? .189 : index >= STAIR.count ? STAIR.landingY : .24 + (index + .5) * STAIR.rise + .075;
}
export function tourBeatAt(progress: number): number { return progress < .12 ? 0 : progress < DOORWAY ? 1 : progress < .92 ? 2 : 3; }
export type TourPlayback = { progress: number; shutter: number };
export function advanceTour(playback: TourPlayback, destination: number, delta: number) {
  // Use real elapsed time through dropped frames, with a bounded step after
  // a suspended tab or a long idle interval.
  const target = clamp(destination), dt = Math.min(delta, .1);
  const distance = target - playback.progress;
  playback.progress = Math.abs(distance) < .00005 ? target : playback.progress + distance * -Math.expm1(-12 * dt);
  playback.shutter = 0;
  return playback.progress !== target;
}
export function sampleCamera(progress: number, mobile: boolean, position: Point, target: Point): number {
  const stops = mobile ? MOBILE_CAMERAS : DESKTOP_CAMERAS, p = clamp(progress);
  let index = stops.findIndex((stop, i) => i < stops.length - 1 && p <= stops[i + 1].at);
  if (index < 0) index = stops.length - 2;
  const a = stops[index], b = stops[index + 1];
  const t = smooth((p - a.at) / (b.at - a.at));
  for (let i = 0; i < 3; i++) { position[i] = a.position[i] + (b.position[i] - a.position[i]) * t; target[i] = a.target[i] + (b.target[i] - a.target[i]) * t; }
  return a.fov + (b.fov - a.fov) * t;
}

export type GuidePose = { position: Point; yaw: number; stair: number; walk: number };
// Walk time derives from progress, so stopping/reversing scroll plants the feet.
export function sampleGuide(progress: number, pose: GuidePose) {
  const p = clamp(progress);
  pose.stair = -1; pose.walk = 0;
  if (p < .16) {
    pose.position[0] = STAIR.x; pose.position[1] = stairHeight(0); pose.position[2] = STAIR.bottomZ;
    pose.yaw = Math.PI * smooth((p - .12) / .04);
    return;
  }
  if (p <= .52) {
    const t = smooth((p - .16) / .36);
    pose.stair = t * STAIR.count;
    pose.position[0] = STAIR.x;
    pose.position[1] = stairHeight(0) + (STAIR.landingY - stairHeight(0)) * t;
    pose.position[2] = STAIR.bottomZ - STAIR.run * pose.stair;
    pose.yaw = Math.PI; pose.walk = pose.stair * .33;
    return;
  }
  const stops = [
    { at: .52, p: [STAIR.x, STAIR.landingY, STAIR.bottomZ - STAIR.count * STAIR.run], yaw: Math.PI },
    { at: .68, p: [8.05, STAIR.landingY, -1.26], yaw: Math.PI },
    { at: .76, p: [4.52, STAIR.landingY, -1.26], yaw: Math.PI * 1.5 },
    { at: .853, p: [4.52, STAIR.landingY, -1.26], yaw: Math.PI * 1.5 },
    { at: .90, p: [1.1, STAIR.landingY, -1.6], yaw: Math.PI * 1.5 },
    { at: .93, p: [.65, STAIR.landingY, -5.1], yaw: Math.PI },
    { at: 1, p: [.65, STAIR.landingY, -5.1], yaw: Math.PI * 2 },
  ];
  let i = stops.findIndex((s, i) => i < stops.length - 1 && p <= stops[i + 1].at);
  if (i < 0) i = stops.length - 2;
  const a = stops[i], b = stops[i + 1], t = smooth((p - a.at) / (b.at - a.at));
  for (let axis = 0; axis < 3; axis++) pose.position[axis] = a.p[axis] + (b.p[axis] - a.p[axis]) * t;
  pose.yaw = a.yaw + (b.yaw - a.yaw) * t;
  pose.walk = 6.6 + (Math.min(p, .93) - .52) * 25;
}
