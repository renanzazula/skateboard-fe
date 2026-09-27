/**
 * Pure maths for SkateLoader's atom — no react-native imports, so it runs
 * under the bare jest-expo transform. The functions marked 'worklet' are
 * also called from Reanimated animated styles on the UI thread.
 */

/** Sizes of every layer, derived from the loader's square size. */
export function atomMetrics(size: number) {
  return {
    nucleus: Math.round(size * 0.5),
    badge: Math.round(size * 0.2),
    splash: Math.round(size * 0.7),
    orbitRx: size * 0.4,
    orbitRy: size * 0.17,
    spark: Math.max(3, Math.round(size * 0.035)),
    sparkFrom: size * 0.23,
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

/**
 * The paint splash through one explosion: bursts out of the wheel, is at
 * full cover as the hub image swaps (so the swap itself is never seen), then
 * fades while still spreading.
 */
export function splashFrame(b: number): { scale: number; opacity: number; rotate: number } {
  'worklet';
  if (idle(b)) return { scale: 0, opacity: 0, rotate: 0 };
  const grow = easeOutCubic(Math.min(1, b / 0.45));
  let opacity = 1;
  if (b < 0.12) opacity = b / 0.12;
  else if (b > SWAP_AT + 0.15) opacity = Math.max(0, 1 - (b - SWAP_AT - 0.15) / 0.35);
  return { scale: 0.25 + 0.95 * grow + 0.15 * b, opacity, rotate: 30 * b };
}

function easeInOutCubic(k: number): number {
  'worklet';
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

/**
 * An orbiting badge on its way into (dive 0 → 1) or back out of (1 → 0)
 * the wheel's hub. At 0 it's wherever its orbit puts it, sized and dimmed
 * by depth; at 1 it's centred at `hubScale` — the size of the hub image it
 * turns into — and faded out into the splash that covers the swap. While
 * travelling it's drawn above everything else.
 */
export function divePose(
  orbit: ElectronPoint,
  dive: number,
  hubScale: number,
): { x: number; y: number; scale: number; opacity: number; zIndex: number } {
  'worklet';
  const near = (orbit.depth + 1) / 2;
  const restScale = 0.75 + 0.3 * near;
  const restOpacity = 0.7 + 0.3 * near;
  const e = easeInOutCubic(Math.min(1, Math.max(0, dive)));
  const fade = dive > 0.85 ? 1 - (dive - 0.85) / 0.15 : 1;
  return {
    x: orbit.x * (1 - e),
    y: orbit.y * (1 - e),
    scale: restScale + (hubScale - restScale) * e,
    opacity: restOpacity * Math.max(0, fade),
    zIndex: dive > 0.01 ? 5 : orbit.depth >= 0 ? 3 : 1,
  };
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
