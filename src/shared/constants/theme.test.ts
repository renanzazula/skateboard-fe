import { BottomTabInset, Colors, DisplayFontFamily, Fonts, MAX_CONTENT_WIDTH, MAX_FORM_WIDTH, MOBILE_WEB_MAX_WIDTH, RADII, Spacing } from '@/shared/constants/theme';

describe('theme constants', () => {
  it('exposes the dark brand palette', () => {
    expect(Colors.background).toBe('#0D0D0D');
    expect(Colors.primary).toBe('#F5C518');
    expect(Object.keys(Colors).length).toBeGreaterThan(10);
  });

  it('exposes corner radii, spacing scale, and layout constants', () => {
    expect(RADII).toEqual({ card: 16, control: 12, pill: 999 });
    expect(Spacing).toEqual({ half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 });
    expect(MAX_FORM_WIDTH).toBe(480);
    expect(MAX_CONTENT_WIDTH).toBe(720);
    expect(MOBILE_WEB_MAX_WIDTH).toBe(768);
    expect(DisplayFontFamily).toBe('Fraunces_700Bold');
  });

  it('resolves a Fonts family set for the current platform', () => {
    expect(Fonts).toBeDefined();
    expect(typeof Fonts?.sans).toBe('string');
    expect(typeof Fonts?.mono).toBe('string');
  });

  it('resolves a numeric BottomTabInset for the current platform', () => {
    expect(typeof BottomTabInset).toBe('number');
  });
});
