import { localDay } from '@/features/campaign/dates';

describe('localDay', () => {
  it('formats as zero-padded YYYY-MM-DD in local time', () => {
    expect(localDay(new Date(2026, 0, 3, 9, 0, 0))).toBe('2026-01-03');
    expect(localDay(new Date(2026, 11, 25, 23, 59, 0))).toBe('2026-12-25');
  });

  it('rolls over at local midnight', () => {
    const beforeMidnight = new Date(2026, 5, 30, 23, 59, 59);
    const afterMidnight = new Date(2026, 6, 1, 0, 0, 1);
    expect(localDay(beforeMidnight)).toBe('2026-06-30');
    expect(localDay(afterMidnight)).toBe('2026-07-01');
    expect(localDay(beforeMidnight)).not.toBe(localDay(afterMidnight));
  });
});
