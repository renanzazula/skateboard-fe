import { isAllowedInternalTarget, isExternalUrl, toAppRoute } from '@/features/campaign/ctaMatch';

describe('isAllowedInternalTarget', () => {
  it('accepts an exact allow-list prefix', () => {
    expect(isAllowedInternalTarget('/home')).toBe(true);
    expect(isAllowedInternalTarget('/podcasts')).toBe(true);
    expect(isAllowedInternalTarget('/settings/about-us')).toBe(true);
  });

  it('accepts a path segment under an allow-list prefix', () => {
    expect(isAllowedInternalTarget('/podcasts/123')).toBe(true);
    expect(isAllowedInternalTarget('/competitions/summer-2026')).toBe(true);
  });

  it('rejects anything outside the allow-list', () => {
    expect(isAllowedInternalTarget('/settings')).toBe(false);
    expect(isAllowedInternalTarget('/homepage')).toBe(false); // prefix must be a full segment
    expect(isAllowedInternalTarget('/admin')).toBe(false);
    expect(isAllowedInternalTarget('podcasts')).toBe(false);
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

  it('returns null for destinations with no V1 screen', () => {
    expect(toAppRoute('/events')).toBeNull();
    expect(toAppRoute('/competitions/x')).toBeNull();
  });
});
