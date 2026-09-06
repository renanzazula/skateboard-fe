import { isAllowedInternalTarget, isExternalUrl, toAppRoute } from '@/features/campaign/ctaMatch';
import { INTERNAL_CTA_PREFIXES } from '@/features/campaign/types';

describe('INTERNAL_CTA_PREFIXES', () => {
  // Byte-identical to skateboard-app-config-be's
  // CampaignScreen.ALLOWED_INTERNAL_ROUTE_PREFIXES. If that list changes,
  // update this copy (and toAppRoute) — there is no shared registry (BE plan
  // gap #6). This test is the drift alarm.
  it('matches the backend allow-list exactly', () => {
    expect([...INTERNAL_CTA_PREFIXES]).toEqual(['/home', '/podcasts', '/settings/about-us']);
  });

  it('every allow-listed prefix maps to a real app route', () => {
    for (const prefix of INTERNAL_CTA_PREFIXES) {
      expect(toAppRoute(prefix)).not.toBeNull();
    }
  });
});

describe('isAllowedInternalTarget', () => {
  it('accepts an exact allow-list prefix', () => {
    expect(isAllowedInternalTarget('/home')).toBe(true);
    expect(isAllowedInternalTarget('/podcasts')).toBe(true);
    expect(isAllowedInternalTarget('/settings/about-us')).toBe(true);
  });

  it('accepts a path segment under an allow-list prefix', () => {
    expect(isAllowedInternalTarget('/podcasts/123')).toBe(true);
    expect(isAllowedInternalTarget('/settings/about-us/history')).toBe(true);
  });

  it('rejects anything outside the allow-list', () => {
    expect(isAllowedInternalTarget('/settings')).toBe(false);
    expect(isAllowedInternalTarget('/homepage')).toBe(false); // prefix must be a full segment
    expect(isAllowedInternalTarget('/admin')).toBe(false);
    expect(isAllowedInternalTarget('podcasts')).toBe(false);
    expect(isAllowedInternalTarget('/events')).toBe(false); // dropped for V1
    expect(isAllowedInternalTarget('/competitions/summer')).toBe(false);
  });
});

describe('isExternalUrl', () => {
  it('accepts absolute http(s) URLs', () => {
    expect(isExternalUrl('https://example.com')).toBe(true);
    expect(isExternalUrl('http://example.com/path?q=1')).toBe(true);
  });

  it('rejects relative paths and other schemes', () => {
    expect(isExternalUrl('/home')).toBe(false);
    expect(isExternalUrl('ftp://example.com')).toBe(false);
    expect(isExternalUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('toAppRoute', () => {
  it('maps product destinations to real router paths', () => {
    expect(toAppRoute('/home')).toBe('/');
    expect(toAppRoute('/podcasts')).toBe('/podcast');
    expect(toAppRoute('/podcasts/abc')).toBe('/podcast/abc');
    expect(toAppRoute('/settings/about-us')).toBe('/settings/about-us');
  });
});
