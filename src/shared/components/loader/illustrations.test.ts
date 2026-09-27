import {
  NUCLEUS_HUB,
  SCENES,
  nucleusShineXml,
  nucleusWheelXml,
  orbitsXml,
  type DrawnScene,
  sceneXml,
  wheelShineXml,
  wheelXml,
  type IllustrationPalette,
} from '@/shared/components/loader/illustrations';

// Distinct sentinel per token, so a test can tell which one ended up where.
const palette: IllustrationPalette = {
  primary: '#000001',
  primaryPressed: '#000002',
  background: '#000003',
  textPrimary: '#000004',
};
const DRAWN = SCENES.filter((scene): scene is DrawnScene => scene !== 'brand');

const all: [string, string][] = [
  ['wheel', wheelXml(palette)],
  ['shine', wheelShineXml(palette)],
  ['orbits', orbitsXml(palette)],
  ['nucleus tyre', nucleusWheelXml(palette)],
  ['nucleus shine', nucleusShineXml(palette)],
  ...DRAWN.map((scene): [string, string] => [scene, sceneXml(scene, palette)]),
];

describe('loader illustrations', () => {
  it('opens on the brand icon, then cycles skate → Barcelona → podcast → places', () => {
    expect(SCENES).toEqual(['brand', 'skate', 'barcelona', 'podcast', 'places']);
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

  it('draws every scene in the logo colours: yellow, white and black', () => {
    for (const scene of DRAWN) {
      const xml = sceneXml(scene, palette);
      for (const colour of [palette.primary, palette.textPrimary, palette.background]) expect(xml).toContain(colour);
    }
  });

  it('draws the hand-made wobble the same way every time', () => {
    for (const scene of DRAWN) expect(sceneXml(scene, palette)).toBe(sceneXml(scene, palette));
  });

  it('leaves the nucleus hub open for the scene, framed by the core lip', () => {
    const xml = nucleusWheelXml(palette);
    // Nothing in the tyre is filled — it's all strokes and printed marks on
    // the ring — so the scene underneath shows through the hub.
    expect(xml).not.toMatch(/<circle[^>]*fill="#/);
    // The lip's inner edge sits just inside the hub, covering the scene's edge.
    const lip = xml.match(/r="34.2"[^>]*stroke-width="3.6"/);
    expect(lip).not.toBeNull();
    expect(34.2 - 3.6 / 2).toBeLessThan(NUCLEUS_HUB * 50);
  });

  it('prints three bolts on the nucleus tyre so its roll reads', () => {
    expect(nucleusWheelXml(palette).match(/M0 -7 L4.5 -7/g)).toHaveLength(3);
  });

  it('draws one ring per orbit', () => {
    expect(orbitsXml(palette, 3).match(/<ellipse/g)).toHaveLength(3);
    expect(orbitsXml(palette, 2)).toContain('rotate(90 50 50)');
  });
});
