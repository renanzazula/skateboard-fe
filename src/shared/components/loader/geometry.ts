/**
 * Pure layout math for SkateLoader — no react-native imports, so it runs
 * under the bare jest-expo transform.
 */

export type OrbitPoint = { x: number; y: number };

/**
 * `count` points evenly spaced on a circle of `radius`, centred on
 * (`center`, `center`), starting at 12 o'clock and going clockwise.
 */
export function orbitPositions(count: number, radius: number, center: number): OrbitPoint[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return {
      x: round(center + radius * Math.cos(angle)),
      y: round(center + radius * Math.sin(angle)),
    };
  });
}

/** Sizes of every loader layer, derived from the overall square size. */
export function loaderMetrics(size: number) {
  const badge = Math.round(size * 0.3);
  const orbitRadius = (size - badge) / 2;
  return {
    badge,
    icon: Math.round(badge * 0.8),
    orbitRadius,
    wheel: Math.round(size * 0.36),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
