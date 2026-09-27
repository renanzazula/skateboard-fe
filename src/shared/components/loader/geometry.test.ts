import {
  SWAP_AT,
  atomMetrics,
  electronPoint,
  flashOpacity,
  nucleusBurst,
  orbitKick,
  orbitTiltDeg,
  shockwave,
  sparkPoint,
} from '@/shared/components/loader/geometry';

const close = (value: number) => Number(value.toFixed(6));

describe('atomMetrics', () => {
  it('keeps the orbits and sparks inside a sensible envelope', () => {
    const m = atomMetrics(200);
    expect(m.nucleus).toBe(100);
    expect(m.orbitRx + m.wheel / 2).toBeLessThanOrEqual(100);
    expect(m.orbitRy).toBeLessThan(m.orbitRx);
    expect(m.spark).toBeGreaterThanOrEqual(3);
    // sparks leave from about the nucleus tyre
    expect(m.sparkFrom).toBeCloseTo(m.nucleus / 2, -1);
  });

  it('never makes a spark smaller than 3px', () => {
    expect(atomMetrics(20).spark).toBe(3);
  });
});

describe('orbitTiltDeg', () => {
  it('fans three orbits like the React logo', () => {
    expect([0, 1, 2].map((i) => orbitTiltDeg(i, 3))).toEqual([0, 60, 120]);
  });
});

describe('electronPoint', () => {
  it('starts at the right-hand end of an untilted orbit, side on', () => {
    const p = electronPoint(0, 40, 10, 0);
    expect(close(p.x)).toBe(40);
    expect(close(p.y)).toBe(0);
    expect(close(p.depth)).toBe(0);
  });

  it('is nearest the viewer a quarter lap in and furthest three quarters in', () => {
    const near = electronPoint(0.25, 40, 10, 0);
    expect(close(near.y)).toBe(10);
    expect(close(near.depth)).toBe(1);
    expect(close(electronPoint(0.75, 40, 10, 0).depth)).toBe(-1);
  });

  it('rotates the orbit by its tilt', () => {
    const p = electronPoint(0, 40, 10, 90);
    expect(close(p.x)).toBe(0);
    expect(close(p.y)).toBe(40);
  });
});

describe('explosion', () => {
  it('leaves everything at rest outside a burst', () => {
    for (const b of [0, 1]) {
      expect(nucleusBurst(b)).toEqual({ scale: 1, opacity: 1 });
      expect(flashOpacity(b)).toBe(0);
      expect(shockwave(b).opacity).toBe(0);
      expect(orbitKick(b)).toBe(0);
      expect(sparkPoint(b, 3, 14, 100).opacity).toBe(0);
    }
  });

  it('fades the nucleus out before the swap and back in after it', () => {
    expect(nucleusBurst(SWAP_AT / 2).opacity).toBeCloseTo(0.5);
    expect(nucleusBurst(SWAP_AT / 2).scale).toBeGreaterThan(1);
    expect(nucleusBurst(SWAP_AT + 0.001).opacity).toBeLessThan(0.05);
    expect(nucleusBurst(0.999).opacity).toBe(1);
    expect(nucleusBurst(0.999).scale).toBeCloseTo(1, 2);
  });

  it('pops the new image in with an overshoot', () => {
    const peak = Math.max(...Array.from({ length: 50 }, (_, i) => nucleusBurst(SWAP_AT + ((1 - SWAP_AT) * i) / 50).scale));
    expect(peak).toBeGreaterThan(1);
  });

  it('flashes brightest at the swap', () => {
    expect(flashOpacity(SWAP_AT)).toBeCloseTo(0.9);
    expect(flashOpacity(0.8)).toBe(0);
  });

  it('grows the shockwave while fading it', () => {
    expect(shockwave(0.8).scale).toBeGreaterThan(shockwave(0.2).scale);
    expect(shockwave(0.8).opacity).toBeLessThan(shockwave(0.2).opacity);
  });

  it('kicks the orbits hardest mid-burst', () => {
    expect(orbitKick(0.5)).toBeCloseTo(1);
  });

  it('throws sparks outwards in different directions', () => {
    const early = sparkPoint(0.2, 0, 14, 100);
    const late = sparkPoint(0.8, 0, 14, 100);
    expect(Math.hypot(late.x, late.y)).toBeGreaterThan(Math.hypot(early.x, early.y));
    expect(late.opacity).toBeLessThan(early.opacity);
    expect(sparkPoint(0.05, 0, 14, 100).opacity).toBeCloseTo(0.5);

    const angles = Array.from({ length: 14 }, (_, i) => {
      const s = sparkPoint(0.5, i, 14, 100);
      return Math.round((Math.atan2(s.y, s.x) * 180) / Math.PI);
    });
    expect(new Set(angles).size).toBe(14);
  });

  it('launches sparks from the nucleus rim, not its centre', () => {
    const s = sparkPoint(0.001, 0, 14, 100, 30);
    expect(Math.hypot(s.x, s.y)).toBeCloseTo(30, 0);
  });
});
