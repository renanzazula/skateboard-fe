import {
  SCENES,
  orbitsXml,
  sceneXml,
  wheelShineXml,
  wheelXml,
  type IllustrationPalette,
} from '@/shared/components/loader/illustrations';
import { Colors, IllustrationColors } from '@/shared/constants/theme';

// Distinct sentinel per token, so a test can tell which one ended up where.
const keys = Object.keys({ ...Colors, ...IllustrationColors });
const palette = Object.fromEntries(
  keys.map((key, i) => [key, `#00${i.toString(16).padStart(4, '0')}`]),
) as unknown as IllustrationPalette;

const all: [string, string][] = [
  ['wheel', wheelXml(palette)],
  ['shine', wheelShineXml(palette)],
  ['orbits', orbitsXml(palette)],
  ...SCENES.map((scene): [string, string] => [scene, sceneXml(scene, palette)]),
];

describe('loader illustrations', () => {
  it('cycles skate → Barcelona → podcast → places', () => {
    expect(SCENES).toEqual(['skate', 'barcelona', 'podcast', 'places']);
  });

  it.each(all)('%s is a single 100×100 svg document', (_, xml) => {
    expect(xml.startsWith('<svg')).toBe(true);
    expect(xml).toContain('viewBox="0 0 100 100"');
    expect(xml.match(/<svg/g)).toHaveLength(1);
    expect(xml).not.toContain('NaN');
    expect(xml).not.toContain('undefined');
  });

  it.each(all)('%s only uses colours from the palette', (_, xml) => {
    const allowed = new Set(Object.values(palette));
    const used = xml.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    expect(used.length).toBeGreaterThan(0);
    for (const colour of used) expect(allowed).toContain(colour);
  });

  it.each(all)('%s references only gradients, patterns and clip paths it defines', (_, xml) => {
    const defined = new Set([...xml.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    for (const [, ref] of xml.matchAll(/url\(#([^)]+)\)/g)) expect(defined).toContain(ref);
  });

  it('keeps ids unique across pieces, so they can share a web page', () => {
    const ids = all.flatMap(([, xml]) => [...xml.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws the brand yellow on every scene', () => {
    for (const scene of SCENES) expect(sceneXml(scene, palette)).toContain(palette.primary);
  });

  it('draws one ring per orbit', () => {
    expect(orbitsXml(palette, 3).match(/<ellipse/g)).toHaveLength(3);
    expect(orbitsXml(palette, 2)).toContain('rotate(90 50 50)');
  });
});
