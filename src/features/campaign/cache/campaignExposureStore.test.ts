/* eslint-disable import/first -- jest.mock() must precede the imports it applies to */
const mockStore = new Map<string, string>();

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn((k: string) => Promise.resolve(mockStore.get(k) ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      mockStore.set(k, v);
      return Promise.resolve();
    }),
    deleteItem: jest.fn((k: string) => {
      mockStore.delete(k);
      return Promise.resolve();
    }),
  },
}));

import { clearExposure, readExposure, recordShown } from '@/features/campaign/cache/campaignExposureStore';

const KEY = 'skateboard.campaign.exposure.c1';

beforeEach(() => mockStore.clear());

describe('campaignExposureStore', () => {
  it('returns null when nothing has been recorded', async () => {
    expect(await readExposure('c1')).toBeNull();
  });

  it('records the first display with shownToday = 1', async () => {
    const now = new Date(2026, 5, 15, 9, 0, 0);
    await recordShown('c1', now);
    const exposure = await readExposure('c1');
    expect(exposure).toEqual({ lastShownAt: now.getTime(), shownToday: 1, day: '2026-06-15' });
  });

  it('increments shownToday on the same local day', async () => {
    const morning = new Date(2026, 5, 15, 9, 0, 0);
    const evening = new Date(2026, 5, 15, 21, 30, 0);
    await recordShown('c1', morning);
    await recordShown('c1', evening);
    const exposure = await readExposure('c1');
    expect(exposure?.shownToday).toBe(2);
    expect(exposure?.lastShownAt).toBe(evening.getTime());
  });

  it('resets shownToday to 1 when the local day rolls over', async () => {
    await recordShown('c1', new Date(2026, 5, 15, 23, 59, 0));
    await recordShown('c1', new Date(2026, 5, 16, 0, 1, 0));
    const exposure = await readExposure('c1');
    expect(exposure).toMatchObject({ shownToday: 1, day: '2026-06-16' });
  });

  it('treats a corrupt stored value as absent', async () => {
    mockStore.set(KEY, '{not json');
    expect(await readExposure('c1')).toBeNull();
    mockStore.set(KEY, JSON.stringify({ day: '2026-06-15' })); // missing numeric fields
    expect(await readExposure('c1')).toBeNull();
  });

  it('clears a campaign\'s exposure', async () => {
    await recordShown('c1', new Date());
    await clearExposure('c1');
    expect(await readExposure('c1')).toBeNull();
  });
});