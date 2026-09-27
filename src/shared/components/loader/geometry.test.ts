import { loaderMetrics, orbitPositions } from '@/shared/components/loader/geometry';

describe('orbitPositions', () => {
  it('returns nothing for a non-positive count', () => {
    expect(orbitPositions(0, 10, 50)).toEqual([]);
    expect(orbitPositions(-1, 10, 50)).toEqual([]);
  });

  it('places four points clockwise from 12 o’clock', () => {
    expect(orbitPositions(4, 10, 50)).toEqual([
      { x: 50, y: 40 },
      { x: 60, y: 50 },
      { x: 50, y: 60 },
      { x: 40, y: 50 },
    ]);
  });
});

describe('loaderMetrics', () => {
  it('keeps the badges inside the square', () => {
    const size = 120;
    const m = loaderMetrics(size);
    expect(m.orbitRadius + m.badge / 2).toBe(size / 2);
    expect(m.icon).toBeLessThan(m.badge);
    expect(m.wheel).toBeLessThan(size - 2 * m.badge);
  });
});
