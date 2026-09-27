/**
 * SkateLoader artwork as SVG markup, rendered through react-native-svg's
 * `SvgXml`. Kept as plain strings (no react-native imports) so the same
 * markup can be unit-tested here and opened directly in a browser to review
 * the artwork. Every colour comes from the palette argument: pass the theme's
 * `Colors` and `IllustrationColors` in, never hex literals.
 *
 * Scenes are round medallions on a 100×100 canvas, lit from the top left.
 * Ids carry a per-piece prefix so several pieces can share one web page.
 */

export type IllustrationPalette = {
  primary: string;
  primaryPressed: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  metalLight: string;
  metalMid: string;
  metalDark: string;
  stoneLight: string;
  stoneMid: string;
  stoneDark: string;
  mapleLight: string;
  mapleDark: string;
  gripTape: string;
  urethaneLight: string;
  urethaneDark: string;
  shine: string;
  shadow: string;
  skyDusk: string;
  skySunset: string;
  asphalt: string;
  asphaltLight: string;
};

/** The nucleus scenes, in the order the loader cycles through them. */
export const SCENES = ['skate', 'barcelona', 'podcast', 'places'] as const;
export type Scene = (typeof SCENES)[number];

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

const n = (value: number) => Number(value.toFixed(2));

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [n(cx + r * Math.cos(rad)), n(cy + r * Math.sin(rad))];
}

/** Clockwise arc path, angles in degrees (0 = 3 o'clock). */
function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const urethaneStops = (p: IllustrationPalette) =>
  `<stop offset="0" stop-color="${p.urethaneLight}"/>` +
  `<stop offset="0.5" stop-color="${p.primary}"/>` +
  `<stop offset="1" stop-color="${p.urethaneDark}"/>`;

const chromeStops = (p: IllustrationPalette) =>
  `<stop offset="0" stop-color="${p.metalMid}"/>` +
  `<stop offset="0.28" stop-color="${p.metalLight}"/>` +
  `<stop offset="0.55" stop-color="${p.metalMid}"/>` +
  `<stop offset="0.8" stop-color="${p.metalDark}"/>` +
  `<stop offset="1" stop-color="${p.metalMid}"/>`;

/**
 * The medallion every scene sits in: clipped to a circle, with a rim that
 * catches the light at the top left and falls into shadow at the bottom
 * right, and a soft glass sheen across the top.
 */
function medallion(id: string, p: IllustrationPalette, defs: string, scene: string): string {
  return svg(
    `<defs>${defs}` +
      `<clipPath id="${id}-clip"><circle cx="50" cy="50" r="48"/></clipPath>` +
      `<linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${p.urethaneLight}"/><stop offset="0.45" stop-color="${p.primary}"/>` +
      `<stop offset="1" stop-color="${p.urethaneDark}"/>` +
      `</linearGradient>` +
      `<linearGradient id="${id}-sheen" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${p.shine}" stop-opacity="0.22"/><stop offset="1" stop-color="${p.shine}" stop-opacity="0"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<g clip-path="url(#${id}-clip)">${scene}` +
      `<ellipse cx="42" cy="14" rx="40" ry="18" fill="url(#${id}-sheen)"/>` +
      `</g>` +
      `<circle cx="50" cy="50" r="47.5" fill="none" stroke="url(#${id}-rim)" stroke-width="3"/>` +
      `<circle cx="50" cy="50" r="45.6" fill="none" stroke="${p.shadow}" stroke-opacity="0.45" stroke-width="0.8"/>`,
  );
}

/** Skate: a board seen from above on a spotlit concrete floor. */
function skateXml(p: IllustrationPalette): string {
  const id = 'sls';
  const wheel = (x: number, y: number) =>
    `<rect x="${x - 5}" y="${y - 4}" width="10" height="8" rx="3" fill="url(#${id}-ure)"/>` +
    `<rect x="${x - 3.6}" y="${y - 2.8}" width="3" height="1.6" rx="0.8" fill="${p.shine}" fill-opacity="0.6"/>`;
  const bolts = (x: number) =>
    [-4, 4]
      .flatMap((dx) => [-4, 4].map((dy) => `<circle cx="${x + dx}" cy="${50 + dy}" r="1.1" fill="url(#${id}-bolt)"/>`))
      .join('');

  const defs =
    `<radialGradient id="${id}-floor" cx="0.45" cy="0.4" r="0.7">` +
    `<stop offset="0" stop-color="${p.asphaltLight}"/><stop offset="1" stop-color="${p.background}"/>` +
    `</radialGradient>` +
    `<radialGradient id="${id}-spot" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="${p.primary}" stop-opacity="0.35"/><stop offset="1" stop-color="${p.primary}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="${id}-ure" cx="0.35" cy="0.3" r="0.9">${urethaneStops(p)}</radialGradient>` +
    `<radialGradient id="${id}-bolt" cx="0.35" cy="0.3" r="0.8">` +
    `<stop offset="0" stop-color="${p.metalLight}"/><stop offset="1" stop-color="${p.metalDark}"/>` +
    `</radialGradient>` +
    `<linearGradient id="${id}-grip" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${p.asphaltLight}"/><stop offset="0.35" stop-color="${p.gripTape}"/>` +
    `<stop offset="1" stop-color="${p.gripTape}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}-shadow" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="${p.shadow}" stop-opacity="0.7"/><stop offset="1" stop-color="${p.shadow}" stop-opacity="0"/>` +
    `</radialGradient>`;

  const scene =
    `<rect width="100" height="100" fill="url(#${id}-floor)"/>` +
    `<circle cx="50" cy="50" r="42" fill="url(#${id}-spot)"/>` +
    // expansion joints in the concrete
    `<path d="M0 78 L100 58 M22 0 L40 100" stroke="${p.shadow}" stroke-opacity="0.35" stroke-width="0.8"/>` +
    `<g transform="rotate(-32 50 50)">` +
    `<ellipse cx="53" cy="56" rx="46" ry="16" fill="url(#${id}-shadow)"/>` +
    wheel(26, 34) +
    wheel(26, 66) +
    wheel(74, 34) +
    wheel(74, 66) +
    // hangers peeking out from under the deck
    `<rect x="24.5" y="36" width="3" height="28" rx="1.2" fill="${p.metalMid}"/>` +
    `<rect x="72.5" y="36" width="3" height="28" rx="1.2" fill="${p.metalMid}"/>` +
    // maple ply edge, then grip tape
    `<rect x="6" y="36.5" width="88" height="27" rx="13.5" fill="${p.mapleLight}"/>` +
    `<rect x="7" y="37.3" width="86" height="25.4" rx="12.7" fill="url(#${id}-grip)"/>` +
    // nose and tail kick lines
    `<path d="M17 38.5 Q14 50 17 61.5 M83 38.5 Q86 50 83 61.5" fill="none" stroke="${p.shine}" stroke-opacity="0.14" stroke-width="0.9"/>` +
    // grip graphic: a yellow wheel mark and a stripe
    `<circle cx="50" cy="50" r="5.2" fill="none" stroke="${p.primary}" stroke-width="1.8"/>` +
    `<circle cx="50" cy="50" r="1.6" fill="${p.primary}"/>` +
    `<path d="M36 50 H43.5 M56.5 50 H64" stroke="${p.primary}" stroke-width="1.2" stroke-linecap="round" stroke-opacity="0.8"/>` +
    bolts(26) +
    bolts(74) +
    `</g>`;

  return medallion(id, p, defs, scene);
}

/**
 * Barcelona: the Sagrada Família in silhouette against a Mediterranean
 * sunset, with a palm in the foreground and the tower crane that has been
 * part of that skyline for as long as anyone can remember.
 */
function barcelonaXml(p: IllustrationPalette): string {
  const id = 'slb';
  const spire = (x: number, top: number, w: number) => {
    const base = 80;
    const h = w / 2;
    return (
      `<path d="M${x - h} ${base} C${x - h} ${top + 18} ${n(x - h * 0.3)} ${top + 5} ${x} ${top} ` +
      `C${n(x + h * 0.3)} ${top + 5} ${x + h} ${top + 18} ${x + h} ${base} Z" fill="url(#${id}-stone)"/>` +
      `<circle cx="${x}" cy="${top - 1.4}" r="1.9" fill="${p.primary}"/>` +
      [0.35, 0.55, 0.75]
        .map((f) => `<rect x="${n(x - 0.7)}" y="${n(top + (base - top) * f)}" width="1.4" height="3.2" rx="0.7" fill="${p.primary}" fill-opacity="0.85"/>`)
        .join('')
    );
  };
  const frond = (d: string) => `<path d="${d}" fill="none" stroke="${p.background}" stroke-width="2.2" stroke-linecap="round"/>`;

  const defs =
    `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${p.skyDusk}"/><stop offset="0.5" stop-color="${p.skySunset}"/>` +
    `<stop offset="0.82" stop-color="${p.urethaneLight}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}-sun" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="${p.shine}" stop-opacity="0.95"/><stop offset="0.35" stop-color="${p.urethaneLight}" stop-opacity="0.9"/>` +
    `<stop offset="1" stop-color="${p.urethaneLight}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="${id}-stone" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${p.asphaltLight}"/><stop offset="0.6" stop-color="${p.gripTape}"/>` +
    `<stop offset="1" stop-color="${p.background}"/>` +
    `</linearGradient>`;

  const scene =
    `<rect width="100" height="100" fill="url(#${id}-sky)"/>` +
    `<circle cx="62" cy="66" r="26" fill="url(#${id}-sun)"/>` +
    // distant hills (Montjuïc / Collserola)
    `<path d="M0 74 Q18 64 34 70 T70 68 T100 66 V100 H0 Z" fill="${p.skyDusk}" fill-opacity="0.55"/>` +
    // crane
    `<g stroke="${p.background}" stroke-width="1.1" fill="none" stroke-linecap="round">` +
    `<path d="M80 80 V16 M64 19 H96 M80 11 L68 19 M80 11 L96 19 M72 19 V29"/>` +
    `<path d="M78 24 L82 30 M82 24 L78 30 M78 36 L82 42 M82 36 L78 42 M78 48 L82 54 M82 48 L78 54" stroke-width="0.6"/>` +
    `</g>` +
    spire(26, 42, 8) +
    spire(66, 42, 8) +
    spire(35, 28, 9) +
    spire(57, 28, 9) +
    spire(46, 14, 12) +
    `<path d="M46 3.5 V10.5 M43.2 6.4 H48.8" stroke="${p.primary}" stroke-width="1.8" stroke-linecap="round"/>` +
    // nave and portals
    `<path d="M18 80 V68 Q46 58 74 68 V80 Z" fill="url(#${id}-stone)"/>` +
    `<circle cx="46" cy="70" r="3.4" fill="${p.primary}" fill-opacity="0.9"/>` +
    `<rect x="0" y="80" width="100" height="20" fill="${p.background}"/>` +
    // palm tree in the foreground
    `<path d="M14 100 Q13 80 18 62" fill="none" stroke="${p.background}" stroke-width="2.6" stroke-linecap="round"/>` +
    frond('M18 62 Q10 56 3 60') +
    frond('M18 62 Q12 52 6 50') +
    frond('M18 62 Q20 52 27 50') +
    frond('M18 62 Q26 57 31 62') +
    frond('M18 62 Q18 54 15 48');

  return medallion(id, p, defs, scene);
}

/** Podcast: a studio condenser mic, on air, with sound rippling out. */
function podcastXml(p: IllustrationPalette): string {
  const id = 'slm';
  const waves = [30, 38, 46]
    .map(
      (r, i) =>
        `<path d="${arc(50, 42, r, 205, 245)} M${polar(50, 42, r, 295).join(' ')} A${r} ${r} 0 0 1 ${polar(50, 42, r, 335).join(' ')}" ` +
        `fill="none" stroke="${p.primary}" stroke-opacity="${n(0.85 - i * 0.25)}" stroke-width="2.4" stroke-linecap="round"/>`,
    )
    .join('');

  const defs =
    `<radialGradient id="${id}-bg" cx="0.5" cy="0.4" r="0.7">` +
    `<stop offset="0" stop-color="${p.asphaltLight}"/><stop offset="1" stop-color="${p.background}"/>` +
    `</radialGradient>` +
    `<linearGradient id="${id}-chrome" x1="0" y1="0" x2="1" y2="0">${chromeStops(p)}</linearGradient>` +
    `<linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${p.background}"/><stop offset="0.3" stop-color="${p.asphaltLight}"/>` +
    `<stop offset="0.55" stop-color="${p.gripTape}"/><stop offset="1" stop-color="${p.background}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${id}-band" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${p.urethaneDark}"/><stop offset="0.3" stop-color="${p.urethaneLight}"/>` +
    `<stop offset="1" stop-color="${p.urethaneDark}"/>` +
    `</linearGradient>` +
    `<pattern id="${id}-mesh" width="2.6" height="2.6" patternUnits="userSpaceOnUse">` +
    `<circle cx="1.3" cy="1.3" r="0.75" fill="${p.shadow}" fill-opacity="0.45"/>` +
    `</pattern>`;

  const scene =
    `<rect width="100" height="100" fill="url(#${id}-bg)"/>` +
    waves +
    `<ellipse cx="50" cy="92" rx="20" ry="3" fill="${p.shadow}" fill-opacity="0.6"/>` +
    // stand
    `<rect x="47.8" y="70" width="4.4" height="20" fill="url(#${id}-chrome)"/>` +
    `<ellipse cx="50" cy="90.5" rx="14" ry="3" fill="url(#${id}-chrome)"/>` +
    // shock-mount yoke
    `<path d="M29 40 V52 A21 21 0 0 0 71 52 V40" fill="none" stroke="url(#${id}-chrome)" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="29" cy="52" r="2.4" fill="${p.metalDark}"/><circle cx="71" cy="52" r="2.4" fill="${p.metalDark}"/>` +
    // capsule head: chrome, perforated mesh, highlight
    `<rect x="36" y="12" width="28" height="40" rx="14" fill="url(#${id}-chrome)"/>` +
    `<rect x="36" y="12" width="28" height="40" rx="14" fill="url(#${id}-mesh)"/>` +
    `<path d="M50 12 V52 M36.6 32 H63.4" stroke="${p.metalDark}" stroke-opacity="0.35" stroke-width="0.7"/>` +
    `<rect x="40.5" y="16" width="3.6" height="30" rx="1.8" fill="${p.shine}" fill-opacity="0.55"/>` +
    // brand band + body
    `<rect x="35" y="49" width="30" height="5.5" rx="1.6" fill="url(#${id}-band)"/>` +
    `<path d="M37 54.5 H63 L60.8 70 Q60.5 72 58.5 72 H41.5 Q39.5 72 39.2 70 Z" fill="url(#${id}-body)"/>` +
    `<rect x="42" y="56" width="2" height="13" rx="1" fill="${p.shine}" fill-opacity="0.18"/>` +
    // on-air lamp
    `<circle cx="50" cy="61" r="2.2" fill="${p.primary}"/>` +
    `<circle cx="50" cy="61" r="4" fill="${p.primary}" fill-opacity="0.25"/>`;

  return medallion(id, p, defs, scene);
}

/**
 * Places: a pin dropped on Barcelona's Eixample — the grid of chamfered
 * octagonal blocks, cut through by the Diagonal.
 */
function placesXml(p: IllustrationPalette): string {
  const id = 'slp';
  const block = (x: number, y: number, s = 17, c = 4.5) =>
    `<path d="M${x + c} ${y} H${x + s - c} L${x + s} ${y + c} V${y + s - c} L${x + s - c} ${y + s} H${x + c} L${x} ${y + s - c} V${y + c} Z"/>`;
  const blocks: string[] = [];
  for (let row = -1; row < 5; row++) {
    for (let col = -1; col < 5; col++) blocks.push(block(col * 23 + 4, row * 23 + 4));
  }

  const defs =
    `<radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="${p.primary}" stop-opacity="0.45"/><stop offset="1" stop-color="${p.primary}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="${id}-pin" cx="0.32" cy="0.25" r="0.95">${urethaneStops(p)}</radialGradient>` +
    `<radialGradient id="${id}-hole" cx="0.5" cy="0.35" r="0.7">` +
    `<stop offset="0" stop-color="${p.asphaltLight}"/><stop offset="1" stop-color="${p.background}"/>` +
    `</radialGradient>` +
    `<radialGradient id="${id}-shade" cx="0.5" cy="0.45" r="0.6">` +
    `<stop offset="0.55" stop-color="${p.shadow}" stop-opacity="0"/><stop offset="1" stop-color="${p.shadow}" stop-opacity="0.7"/>` +
    `</radialGradient>`;

  const scene =
    `<rect width="100" height="100" fill="${p.asphalt}"/>` +
    `<g fill="${p.asphaltLight}">${blocks.join('')}</g>` +
    // the Diagonal
    `<path d="M-10 86 L110 22" stroke="${p.asphalt}" stroke-width="9"/>` +
    `<path d="M-10 86 L110 22" stroke="${p.primary}" stroke-opacity="0.35" stroke-width="0.8" stroke-dasharray="3 3"/>` +
    // route to the spot
    `<path d="M12 96 Q20 70 38 74 T50 76" fill="none" stroke="${p.primary}" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.1 4.2"/>` +
    `<rect width="100" height="100" fill="url(#${id}-shade)"/>` +
    `<circle cx="50" cy="76" r="20" fill="url(#${id}-glow)"/>` +
    `<ellipse cx="50" cy="76.5" rx="11" ry="3.6" fill="none" stroke="${p.primary}" stroke-opacity="0.8" stroke-width="1.2"/>` +
    `<ellipse cx="50" cy="76.5" rx="5" ry="1.8" fill="${p.shadow}" fill-opacity="0.6"/>` +
    // pin
    `<path d="M50 76 C43 64 31 55 31 40 A19 19 0 0 1 69 40 C69 55 57 64 50 76 Z" fill="url(#${id}-pin)"/>` +
    `<path d="M50 76 C57 64 69 55 69 40" fill="none" stroke="${p.urethaneDark}" stroke-width="1.5"/>` +
    `<circle cx="50" cy="40" r="8.5" fill="url(#${id}-hole)"/>` +
    `<circle cx="50" cy="40" r="8.5" fill="none" stroke="${p.urethaneDark}" stroke-width="1.2"/>` +
    `<circle cx="50" cy="40" r="3" fill="${p.primary}"/>` +
    `<ellipse cx="41" cy="30" rx="3.6" ry="6.5" transform="rotate(38 41 30)" fill="${p.shine}" fill-opacity="0.55"/>`;

  return medallion(id, p, defs, scene);
}

const SCENE_BUILDERS: Record<Scene, (p: IllustrationPalette) => string> = {
  skate: skateXml,
  barcelona: barcelonaXml,
  podcast: podcastXml,
  places: placesXml,
};

export function sceneXml(scene: Scene, p: IllustrationPalette): string {
  return SCENE_BUILDERS[scene](p);
}

/**
 * Skateboard wheel, face on — the atom's electrons. Urethane tyre with a
 * printed graphic (the mark that makes the roll readable), a riding lip, a
 * dark core and a steel bearing. No highlight: that's `wheelShineXml`,
 * layered on top and kept still so the light doesn't spin with the wheel.
 */
export function wheelXml(p: IllustrationPalette): string {
  const id = 'slw';
  const balls = Array.from({ length: 8 }, (_, i) => {
    const [x, y] = polar(50, 50, 15, i * 45);
    return `<circle cx="${x}" cy="${y}" r="2" fill="${p.metalDark}" fill-opacity="0.6"/>`;
  }).join('');
  const hex = Array.from({ length: 6 }, (_, i) => polar(50, 50, 7, i * 60).join(' ')).join(' L');
  const [dotX, dotY] = polar(50, 50, 40, 315);

  return svg(
    `<defs>` +
      `<radialGradient id="${id}-ure" cx="0.35" cy="0.3" r="0.8">${urethaneStops(p)}</radialGradient>` +
      `<radialGradient id="${id}-core" cx="0.4" cy="0.35" r="0.75">` +
      `<stop offset="0" stop-color="${p.asphaltLight}"/><stop offset="1" stop-color="${p.background}"/>` +
      `</radialGradient>` +
      `<radialGradient id="${id}-steel" cx="0.35" cy="0.3" r="0.85">` +
      `<stop offset="0" stop-color="${p.metalLight}"/><stop offset="0.6" stop-color="${p.metalMid}"/><stop offset="1" stop-color="${p.metalDark}"/>` +
      `</radialGradient>` +
      `</defs>` +
      `<circle cx="50" cy="50" r="48" fill="url(#${id}-ure)"/>` +
      `<circle cx="50" cy="50" r="46.8" fill="none" stroke="${p.urethaneDark}" stroke-opacity="0.7" stroke-width="2.4"/>` +
      `<path d="${arc(50, 50, 40, 200, 290)}" fill="none" stroke="${p.background}" stroke-opacity="0.6" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="${dotX}" cy="${dotY}" r="2.8" fill="${p.background}" fill-opacity="0.6"/>` +
      `<circle cx="50" cy="50" r="32" fill="none" stroke="${p.urethaneDark}" stroke-opacity="0.75" stroke-width="2.2"/>` +
      `<circle cx="50" cy="50" r="28" fill="url(#${id}-core)"/>` +
      `<circle cx="50" cy="50" r="20" fill="url(#${id}-steel)" stroke="${p.metalDark}" stroke-width="1.2"/>` +
      balls +
      `<path d="M${hex} Z" fill="${p.metalMid}" stroke="${p.metalDark}" stroke-width="1.2"/>` +
      `<circle cx="50" cy="50" r="3" fill="${p.metalDark}"/>`,
  );
}

/** Static specular light for a wheel: sits over it and doesn't rotate. */
export function wheelShineXml(p: IllustrationPalette): string {
  return svg(
    `<path d="${arc(50, 50, 43, 195, 250)}" fill="none" stroke="${p.shine}" stroke-opacity="0.6" stroke-width="3.8" stroke-linecap="round"/>` +
      `<path d="${arc(50, 50, 43, 258, 266)}" fill="none" stroke="${p.shine}" stroke-opacity="0.5" stroke-width="3.8" stroke-linecap="round"/>` +
      `<path d="${arc(50, 50, 17, 200, 245)}" fill="none" stroke="${p.shine}" stroke-opacity="0.75" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="${arc(50, 50, 45, 20, 80)}" fill="none" stroke="${p.shadow}" stroke-opacity="0.3" stroke-width="4" stroke-linecap="round"/>`,
  );
}

/**
 * The three orbit rings behind the nucleus, React-logo style, on the same
 * 100×100 canvas: ellipses of 84×34 fanned at 0°, 60° and 120°.
 */
export function orbitsXml(p: IllustrationPalette, orbitCount = 3): string {
  const id = 'slo';
  const rings = Array.from(
    { length: orbitCount },
    (_, i) =>
      `<ellipse cx="50" cy="50" rx="42" ry="17" transform="rotate(${n((i * 180) / orbitCount)} 50 50)" ` +
      `fill="none" stroke="url(#${id}-ring)" stroke-width="1.1"/>`,
  ).join('');
  return svg(
    `<defs><linearGradient id="${id}-ring" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${p.urethaneLight}" stop-opacity="0.75"/>` +
      `<stop offset="0.5" stop-color="${p.primary}" stop-opacity="0.35"/>` +
      `<stop offset="1" stop-color="${p.urethaneDark}" stop-opacity="0.7"/>` +
      `</linearGradient></defs>` +
      rings,
  );
}
