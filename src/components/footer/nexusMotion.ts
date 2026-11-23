export interface PointerNormalized {
  x: number;
  y: number;
}

export interface LayerOffset {
  x: number;
  y: number;
}

export interface ParallaxOffsets {
  typography: LayerOffset;
  athlete: LayerOffset;
  glow: LayerOffset;
  subtitle: LayerOffset;
}

export interface ScrollDepthOffsets {
  typographyY: number;
  athleteY: number;
  glowY: number;
  subtitleY: number;
}

export interface MotionProfile {
  reducedMotion: boolean;
  isCompactViewport: boolean;
}

export const NEXUS_BRAND_LETTERS = ['N', 'E', 'X', 'U', 'S'] as const;

export const PARALLAX_AMPLITUDES = {
  typography: { x: 10, y: 6 },
  athlete: { x: 22, y: 12 },
  glow: { x: 36, y: 20 },
  subtitle: { x: 6, y: 4 },
} as const;

export const SCROLL_DEPTH_RANGE = {
  typography: { from: 32, to: -26 },
  athlete: { from: 54, to: -18 },
  glow: { from: 40, to: -32 },
  subtitle: { from: 20, to: -8 },
} as const;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalizes a cursor position inside a container bounding box to [-1, 1] on both axes.
 */
export function normalizePointerPosition(
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number }
): PointerNormalized {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 };
  }

  const rawX = ((clientX - bounds.left) / bounds.width) * 2 - 1;
  const rawY = ((clientY - bounds.top) / bounds.height) * 2 - 1;

  return {
    x: clamp(rawX, -1, 1),
    y: clamp(rawY, -1, 1),
  };
}

/**
 * Computes restrained, depth-stratified parallax offsets for each layer.
 * - Background ambient red glow responds most fluidly behind the silhouette.
 * - Foreground athlete moves opposite/distinctly from typography to create stereo depth.
 * - Oversized NEXUS typography shifts subtly so legibility stays rock-solid.
 */
export function computeParallaxOffsets(
  pointer: PointerNormalized,
  profile: MotionProfile
): ParallaxOffsets {
  if (profile.reducedMotion) {
    return {
      typography: { x: 0, y: 0 },
      athlete: { x: 0, y: 0 },
      glow: { x: 0, y: 0 },
      subtitle: { x: 0, y: 0 },
    };
  }

  const scale = profile.isCompactViewport ? 0.35 : 1;
  const nx = clamp(pointer.x, -1, 1);
  const ny = clamp(pointer.y, -1, 1);

  return {
    typography: {
      x: Number((-nx * PARALLAX_AMPLITUDES.typography.x * scale).toFixed(2)),
      y: Number((-ny * PARALLAX_AMPLITUDES.typography.y * scale).toFixed(2)),
    },
    athlete: {
      x: Number((nx * PARALLAX_AMPLITUDES.athlete.x * scale).toFixed(2)),
      y: Number((ny * PARALLAX_AMPLITUDES.athlete.y * scale).toFixed(2)),
    },
    glow: {
      x: Number((nx * PARALLAX_AMPLITUDES.glow.x * scale).toFixed(2)),
      y: Number((ny * PARALLAX_AMPLITUDES.glow.y * scale).toFixed(2)),
    },
    subtitle: {
      x: Number((-nx * PARALLAX_AMPLITUDES.subtitle.x * scale).toFixed(2)),
      y: Number((-ny * PARALLAX_AMPLITUDES.subtitle.y * scale).toFixed(2)),
    },
  };
}

/**
 * Interpolates vertical scroll-based depth separation across normalized progress [0, 1].
 */
export function computeScrollDepthOffsets(
  progress: number,
  profile: MotionProfile
): ScrollDepthOffsets {
  if (profile.reducedMotion) {
    return { typographyY: 0, athleteY: 0, glowY: 0, subtitleY: 0 };
  }

  const t = clamp(progress, 0, 1);
  const scale = profile.isCompactViewport ? 0.45 : 1;
  const lerp = (from: number, to: number) =>
    Number(((from + (to - from) * t) * scale).toFixed(2));

  return {
    typographyY: lerp(SCROLL_DEPTH_RANGE.typography.from, SCROLL_DEPTH_RANGE.typography.to),
    athleteY: lerp(SCROLL_DEPTH_RANGE.athlete.from, SCROLL_DEPTH_RANGE.athlete.to),
    glowY: lerp(SCROLL_DEPTH_RANGE.glow.from, SCROLL_DEPTH_RANGE.glow.to),
    subtitleY: lerp(SCROLL_DEPTH_RANGE.subtitle.from, SCROLL_DEPTH_RANGE.subtitle.to),
  };
}

/**
 * Computes subtle hover lighting parameters for the foreground athlete silhouette.
 */
export function computeAthleteHoverRim(hovered: boolean, reducedMotion: boolean): {
  rimOpacity: number;
  rimScale: number;
  athleteScale: number;
  athleteLiftY: number;
} {
  if (reducedMotion || !hovered) {
    return {
      rimOpacity: hovered ? 0.88 : 0.62,
      rimScale: 1,
      athleteScale: 1,
      athleteLiftY: 0,
    };
  }

  return {
    rimOpacity: 0.96,
    rimScale: 1.045,
    athleteScale: 1.014,
    athleteLiftY: -4,
  };
}
