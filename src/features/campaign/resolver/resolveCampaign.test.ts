import { resolveCampaign } from '@/features/campaign/resolver/resolveCampaign';
import type { CampaignExposure, CampaignRuntime } from '@/features/campaign/types';

const NOW = new Date(2026, 5, 15, 10, 0, 0); // 2026-06-15
const TODAY = '2026-06-15';
const YESTERDAY = '2026-06-14';

function campaign(over: Partial<CampaignRuntime> & Pick<CampaignRuntime, 'id'>): CampaignRuntime {
  return {
    id: over.id,
    priority: over.priority ?? 0,
    frequencyType: over.frequencyType ?? 'ALWAYS',
    maxDisplaysPerDay: over.maxDisplaysPerDay,
    screens: over.screens ?? [{ id: 's1', position: 1 } as CampaignRuntime['screens'][number]],
  };
}

function exposure(over: Partial<CampaignExposure>): CampaignExposure {
  return { lastShownAt: NOW.getTime(), shownToday: 1, day: TODAY, ...over };
}

const noExposure = {};
const emptySession = new Set<string>();

describe('resolveCampaign', () => {
  it('returns null when there are no campaigns', () => {
    expect(resolveCampaign({ campaigns: [], exposure: noExposure, sessionShownIds: emptySession, now: NOW })).toBeNull();
  });

  it('skips campaigns with no screens', () => {
    const c = campaign({ id: 'a', screens: [] });
    expect(resolveCampaign({ campaigns: [c], exposure: noExposure, sessionShownIds: emptySession, now: NOW })).toBeNull();
  });

  it('picks the first eligible campaign (server already sorted by priority)', () => {
    const high = campaign({ id: 'high', priority: 10 });
    const low = campaign({ id: 'low', priority: 1 });
    const picked = resolveCampaign({ campaigns: [high, low], exposure: noExposure, sessionShownIds: emptySession, now: NOW });
    expect(picked?.id).toBe('high');
  });

  it('falls through to a lower-priority campaign when the first is capped', () => {
    const first = campaign({ id: 'first', frequencyType: 'ONCE' });
    const second = campaign({ id: 'second', frequencyType: 'ALWAYS' });
    const picked = resolveCampaign({
      campaigns: [first, second],
      exposure: { first: exposure({}) },
      sessionShownIds: emptySession,
      now: NOW,
    });
    expect(picked?.id).toBe('second');
  });

  describe('frequency rules', () => {
    it('ALWAYS: always eligible', () => {
      const c = campaign({ id: 'a', frequencyType: 'ALWAYS' });
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ shownToday: 99 }) }, sessionShownIds: emptySession, now: NOW })?.id).toBe('a');
    });

    it('ONCE: only when never shown', () => {
      const c = campaign({ id: 'a', frequencyType: 'ONCE' });
      expect(resolveCampaign({ campaigns: [c], exposure: noExposure, sessionShownIds: emptySession, now: NOW })?.id).toBe('a');
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ day: YESTERDAY }) }, sessionShownIds: emptySession, now: NOW })).toBeNull();
    });

    it('ONCE_PER_SESSION: only when not in the session set', () => {
      const c = campaign({ id: 'a', frequencyType: 'ONCE_PER_SESSION' });
      expect(resolveCampaign({ campaigns: [c], exposure: noExposure, sessionShownIds: emptySession, now: NOW })?.id).toBe('a');
      expect(resolveCampaign({ campaigns: [c], exposure: noExposure, sessionShownIds: new Set(['a']), now: NOW })).toBeNull();
    });

    it('ONCE_PER_DAY: eligible again once the day rolls over', () => {
      const c = campaign({ id: 'a', frequencyType: 'ONCE_PER_DAY' });
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ day: TODAY }) }, sessionShownIds: emptySession, now: NOW })).toBeNull();
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ day: YESTERDAY }) }, sessionShownIds: emptySession, now: NOW })?.id).toBe('a');
    });

    it('MAX_PER_DAY: eligible until today\'s count reaches the cap', () => {
      const c = campaign({ id: 'a', frequencyType: 'MAX_PER_DAY', maxDisplaysPerDay: 3 });
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ day: TODAY, shownToday: 2 }) }, sessionShownIds: emptySession, now: NOW })?.id).toBe('a');
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ day: TODAY, shownToday: 3 }) }, sessionShownIds: emptySession, now: NOW })).toBeNull();
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ day: YESTERDAY, shownToday: 9 }) }, sessionShownIds: emptySession, now: NOW })?.id).toBe('a');
    });

    it('MAX_PER_DAY: defaults the cap to 1 when unset', () => {
      const c = campaign({ id: 'a', frequencyType: 'MAX_PER_DAY' });
      expect(resolveCampaign({ campaigns: [c], exposure: { a: exposure({ day: TODAY, shownToday: 1 }) }, sessionShownIds: emptySession, now: NOW })).toBeNull();
    });

    it('unknown frequency type: fails safe (not shown)', () => {
      const c = campaign({ id: 'a', frequencyType: 'WEEKLY' as CampaignRuntime['frequencyType'] });
      expect(resolveCampaign({ campaigns: [c], exposure: noExposure, sessionShownIds: emptySession, now: NOW })).toBeNull();
    });
  });
});
