/**
 * Pure maths for SkateLoader's atom — no react-native imports, so it runs
 * under the bare jest-expo transform. The functions marked 'worklet' are
 * also called from Reanimated animated styles on the UI thread.
 */

/** Sizes of every layer, derived from the loader's square size. */
export function atomMetrics(size: number) {
  return {
    nucleus: Math.round(size * 0.42),
    wheel: Math.round(size * 0.15),
    orbitRx: size * 0.42,
    orbitRy: size * 0.17,
    spark: Math.max(3, Math.round(size * 0.035)),
    sparkFrom: size * 0.17,
    sparkReach: size * 0.36,
  };
}

/** Tilt of each orbit, React-logo style: evenly fanned over 180°. */
export function orbitTiltDeg(orbit: number, orbitCount: number): number {
  'worklet';
  return (orbit * 180) / orbitCount;
}

export type ElectronPoint = {
  /** Offset from the nucleus centre. */
  x: number;
  y: number;
  /** -1 = furthest behind the nucleus, 1 = nearest the viewer. */
  depth: number;
};

/**
 * Where an electron is at orbit progress `t` (0..1, one lap) on an ellipse of
 * `rx`×`ry` tilted by `tiltDeg`. The ellipse is read as a circle seen at an
 * angle, so the lower half of the lap (sin θ > 0) is the side facing the
 * viewer.
 */
export function electronPoint(t: number, rx: number, ry: number, tiltDeg: number): ElectronPoint {
  'worklet';
  const theta = 2 * Math.PI * t;
  const tilt = (tiltDeg * Math.PI) / 180;
  const ex = rx * Math.cos(theta);
  const ey = ry * Math.sin(theta);
  return {
    x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
    y: ex * Math.sin(tilt) + ey * Math.cos(tilt),
    depth: Math.sin(theta),
  };
}

/** Fraction of an explosion at which the nucleus image is swapped. */
export const SWAP_AT = 0.3;

function easeOutCubic(k: number): number {
  'worklet';
  return 1 - Math.pow(1 - k, 3);
}

function easeOutBack(k: number): number {
  'worklet';
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}

const idle = (b: number) => {
  'worklet';
  return b <= 0 || b >= 1;
};

/**
 * The nucleus through one explosion, `b` running 0..1: it swells and fades
 * out, the image is swapped at `SWAP_AT`, and the new one pops back in with a
 * little overshoot. Outside an explosion it's at rest.
 */
export function nucleusBurst(b: number): { scale: number; opacity: number } {
  'worklet';
  if (idle(b)) return { scale: 1, opacity: 1 };
  if (b < SWAP_AT) {
    const k = b / SWAP_AT;
    return { scale: 1 + 0.3 * k, opacity: 1 - k };
  }
  const k = (b - SWAP_AT) / (1 - SWAP_AT);
  return { scale: 0.45 + 0.55 * easeOutBack(k), opacity: Math.min(1, k * 2.5) };
}

/** White-hot flash over the nucleus, peaking right at the swap. */
export function flashOpacity(b: number): number {
  'worklet';
  if (idle(b)) return 0;
  return Math.max(0, 1 - Math.abs(b - SWAP_AT) / 0.18) * 0.9;
}

/** Expanding shockwave ring. */
export function shockwave(b: number): { scale: number; opacity: number } {
  'worklet';
  if (idle(b)) return { scale: 0, opacity: 0 };
  return { scale: 0.4 + 1.8 * easeOutCubic(b), opacity: 0.9 * (1 - b) };
}

/** 0 → 1 → 0 over an explosion: how far the orbits are blown outwards. */
export function orbitKick(b: number): number {
  'worklet';
  if (idle(b)) return 0;
  return Math.sin(Math.PI * b);
}

/**
 * Spark `i` of `count` flying out from the nucleus rim (`from` px out). Directions and reach vary
 * per spark (deterministically, so every burst looks the same frame to
 * frame) so the explosion doesn't read as a perfect ring.
 */
export function sparkPoint(
  b: number,
  i: number,
  count: number,
  reach: number,
  from = 0,
): { x: number; y: number; opacity: number; scale: number } {
  'worklet';
  if (idle(b)) return { x: 0, y: 0, opacity: 0, scale: 0 };
  const angle = ((i / count) * 360 + ((i * 37) % 17) - 8) * (Math.PI / 180);
  const distance = from + reach * (0.7 + 0.3 * (((i * 7) % 4) / 3)) * easeOutCubic(b);
  const fade = b < 0.1 ? b / 0.1 : 1 - (b - 0.1) / 0.9;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    opacity: fade,
    scale: 1 - 0.6 * b,
  };
}
