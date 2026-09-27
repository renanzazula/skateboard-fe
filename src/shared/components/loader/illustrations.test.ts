import {
  orbitIllustrationXml,
  wheelShineXml,
  wheelXml,
  type IllustrationPalette,
  type OrbitIllustration,
} from '@/shared/components/loader/illustrations';

// Distinct sentinel per token, so a test can tell which one ended up where.
const palette = Object.fromEntries(
  [
    'primary', 'primaryPressed', 'background', 'surface', 'surfaceElevated',
    'metalLight', 'metalMid', 'metalDark', 'stoneLight', 'stoneMid', 'stoneDark',
    'mapleLight', 'mapleDark', 'gripTape', 'urethaneLight', 'urethaneDark', 'shine', 'shadow',
  ].map((key, i) => [key, `#0000${i.toString(16).padStart(2, '0')}`]),
) as IllustrationPalette;

const all: [string, string][] = [
  ['wheel', wheelXml(palette)],
  ['shine', wheelShineXml(palette)],
  ...(['deck', 'barcelona', 'mic', 'pin'] as OrbitIllustration[]).map(
    (kind): [string, string] => [kind, orbitIllustrationXml(kind, palette)],
  ),
];

describe('loader illustrations', () => {
  it.each(all)('%s is a single 64×64 svg document', (_, xml) => {
    expect(xml.startsWith('<svg')).toBe(true);
    expect(xml).toContain('viewBox="0 0 64 64"');
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

  it.each(all)('%s references only gradients and clip paths it defines', (_, xml) => {
    const defined = new Set([...xml.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    for (const [, ref] of xml.matchAll(/url\(#([^)]+)\)/g)) expect(defined).toContain(ref);
  });

  it('keeps gradient ids unique across pieces, so they can share a web page', () => {
    const ids = all.flatMap(([, xml]) => [...xml.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws the brand yellow on every piece but the shine', () => {
    for (const [name, xml] of all) {
      if (name !== 'shine') expect(xml).toContain(palette.primary);
    }
  });
});
