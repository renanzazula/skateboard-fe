/**
 * SkateLoader artwork as SVG markup, rendered through react-native-svg's
 * `SvgXml`. Kept as plain strings (no react-native imports) so the same
 * markup can be unit-tested here and opened directly in a browser to review
 * the artwork. Every colour comes from the palette argument: pass the theme's
 * `Colors` in, never hex literals.
 *
 * The style follows the Skateboard Podcast logo: flat black, skate yellow
 * and white, heavy outlines, hand-painted brush strokes, equaliser bars and
 * lightning sparks. Everything is drawn on a 100×100 canvas; ids carry a
 * per-piece prefix so several pieces can share one web page.
 */

export type IllustrationPalette = {
  primary: string;
  primaryPressed: string;
  background: string;
  textPrimary: string;
};

/**
 * The nucleus scenes, in the order the loader cycles through them. `brand`
 * is the app icon itself (a raster image, see SkateLoader); the rest are
 * drawn here.
 */
export const SCENES = ['brand', 'skate', 'barcelona', 'podcast', 'places'] as const;
export type Scene = (typeof SCENES)[number];
export type DrawnScene = Exclude<Scene, 'brand'>;

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

const n = (value: number) => Number(value.toFixed(2));

/** Small deterministic PRNG, so the hand-drawn wobble is identical on every render. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

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

/**
 * A hand-painted brush stroke, like the swipes under the logo's lettering:
 * blunt where the brush lands, ragged edges, dry bristle streaks trailing
 * off where it lifts.
 */
function brush(cx: number, cy: number, w: number, h: number, rot: number, color: string, seed: number, opacity = 1): string {
  const rand = random(seed);
  const steps = 18;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const land = u < 0.08 ? 0.55 + 0.45 * (u / 0.08) : 1;
    const lift = u > 0.75 ? 1 - 0.75 * Math.pow((u - 0.75) / 0.25, 1.4) : 1;
    const half = (h / 2) * land * lift;
    const x = n(-w / 2 + w * u);
    top.push(`${x} ${n(-half + (rand() - 0.5) * h * 0.22)}`);
    bottom.push(`${x} ${n(half + (rand() - 0.5) * h * 0.22)}`);
  }
  const streaks = Array.from({ length: 4 }, (_, i) => {
    const y = n((i / 3 - 0.5) * h * 0.7);
    const x0 = n(w / 2 - w * 0.15 * rand());
    const x1 = n(w / 2 + w * (0.04 + 0.1 * rand()));
    return `M${x0} ${y} L${x1} ${n(y + (rand() - 0.5) * 1.5)}`;
  }).join(' ');
  return (
    `<g transform="translate(${cx} ${cy}) rotate(${rot})" opacity="${opacity}">` +
    `<path d="M${top.join(' L')} L${bottom.reverse().join(' L')} Z" fill="${color}"/>` +
    `<path d="${streaks}" stroke="${color}" stroke-width="${n(h * 0.09)}" stroke-linecap="round" fill="none"/>` +
    `</g>`
  );
}

/** A lightning spark, like the ones crackling off the logo's mic. */
function bolt(x: number, y: number, scale: number, rot: number, color: string, outline: string): string {
  const d = 'M0 -7 L4.5 -7 L1.8 -1.5 L5 -1.5 L-2.5 8 L-0.6 1.5 L-3.8 1.5 Z';
  return (
    `<path d="${d}" transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" ` +
    `fill="${color}" stroke="${outline}" stroke-width="${n(1.4 / scale)}" stroke-linejoin="round"/>`
  );
}

/** Spray-paint speckle around a point. */
function specks(cx: number, cy: number, spread: number, count: number, color: string, seed: number): string {
  const rand = random(seed);
  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2;
    const r = spread * Math.sqrt(rand());
    return `<circle cx="${n(cx + r * Math.cos(a))}" cy="${n(cy + r * Math.sin(a))}" r="${n(0.3 + rand() * 0.7)}" fill="${color}"/>`;
  }).join('');
}

/**
 * The logo's equaliser skyline: a row of rounded bars under a peaked
 * envelope, with loose dots where the bars run short.
 */
function equaliser(x0: number, x1: number, baseY: number, maxH: number, color: string, seed: number): string {
  const rand = random(seed);
  const bars: string[] = [];
  const width = 2.2;
  const gap = 1.5;
  for (let x = x0; x <= x1 - width; x += width + gap) {
    const u = (x - x0) / (x1 - x0);
    const envelope = 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), 1.6) * (0.75 + 0.25 * Math.sin(u * 19));
    const h = Math.max(1.5, maxH * envelope * (0.7 + 0.3 * rand()));
    if (h < 3.5) {
      bars.push(`<circle cx="${n(x + width / 2)}" cy="${n(baseY - 1.2)}" r="1" fill="${color}"/>`);
    } else {
      bars.push(`<rect x="${n(x)}" y="${n(baseY - h)}" width="${width}" height="${n(h)}" rx="1.1" fill="${color}"/>`);
    }
  }
  return bars.join('');
}

/**
 * The round disc every scene is drawn on: black, clipped, with a thin white
 * keyline. It has no rim of its own — it sits in the hub of the nucleus
 * wheel (`nucleusWheelXml`), whose tyre is the frame.
 */
function sticker(id: string, p: IllustrationPalette, scene: string, defs = ''): string {
  return svg(
    `<defs>${defs}<clipPath id="${id}-clip"><circle cx="50" cy="50" r="48"/></clipPath></defs>` +
      `<circle cx="50" cy="50" r="48" fill="${p.background}"/>` +
      `<g clip-path="url(#${id}-clip)">${scene}</g>`,
  );
}

/**
 * Skate: a board in three-quarter view, like the app icon's — black grip,
 * yellow ply edge, gold wheels — with sparks flying off it.
 */
function skateXml(p: IllustrationPalette): string {
  // The board is drawn top-down, then rotated and squashed into perspective;
  // `project` puts a top-down point where that transform lands it.
  const tilt = (-18 * Math.PI) / 180;
  const squash = 0.55;
  const project = (x: number, y: number): [number, number] => {
    const dx = x - 50;
    const dy = y - 50;
    return [n(50 + dx * Math.cos(tilt) - dy * Math.sin(tilt)), n(48 + squash * (dx * Math.sin(tilt) + dy * Math.cos(tilt)))];
  };
  const board = (dy: number, fill: string, stroke = '') =>
    `<rect x="13" y="37" width="74" height="26" rx="13" transform="translate(50 ${48 + dy}) scale(1 ${squash}) rotate(-18) translate(-50 -50)" ` +
    `fill="${fill}"${stroke}/>`;
  const wheel = ([x, y]: [number, number], r: number, fill: string) =>
    `<ellipse cx="${x}" cy="${n(y + 9)}" rx="${n(r * 0.75)}" ry="${r}" fill="${fill}" stroke="${p.background}" stroke-width="1.6"/>` +
    `<ellipse cx="${n(x - r * 0.12)}" cy="${n(y + 9)}" rx="${n(r * 0.28)}" ry="${n(r * 0.4)}" fill="${p.background}"/>` +
    `<path d="M${n(x - r * 0.45)} ${n(y + 9 - r * 0.5)} Q${n(x - r * 0.6)} ${n(y + 9)} ${n(x - r * 0.45)} ${n(y + 9 + r * 0.45)}" ` +
    `stroke="${p.textPrimary}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  const axle = (a: [number, number], b: [number, number]) =>
    `<path d="M${a[0]} ${n(a[1] + 9)} L${b[0]} ${n(b[1] + 9)}" stroke="${p.textPrimary}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M${n((a[0] + b[0]) / 2)} ${n((a[1] + b[1]) / 2 + 9)} L${n((a[0] + b[0]) / 2)} ${n((a[1] + b[1]) / 2 + 3)}" stroke="${p.primary}" stroke-width="3.4" stroke-linecap="round"/>`;

  const backLeft = project(27, 39);
  const backRight = project(73, 39);
  const frontLeft = project(27, 61);
  const frontRight = project(73, 61);

  const scene =
    brush(18, 14, 52, 13, -38, p.primary, 11, 0.9) +
    brush(86, 90, 50, 12, -38, p.primary, 12, 0.85) +
    bolt(30, 24, 1.25, -20, p.primary, p.background) +
    bolt(19, 34, 0.85, -40, p.primary, p.background) +
    bolt(70, 20, 1.25, 20, p.primary, p.background) +
    bolt(81, 29, 0.85, 40, p.primary, p.background) +
    brush(50, 84, 76, 6, -3, p.textPrimary, 14, 0.95) +
    `<ellipse cx="50" cy="76" rx="34" ry="4.5" fill="${p.primary}" fill-opacity="0.18"/>` +
    // undercarriage: back wheels, axles, front wheels
    wheel(backLeft, 6.4, p.primaryPressed) +
    wheel(backRight, 6.4, p.primaryPressed) +
    axle(backLeft, frontLeft) +
    axle(backRight, frontRight) +
    wheel(frontLeft, 7.8, p.primary) +
    wheel(frontRight, 7.8, p.primary) +
    // board: yellow ply edge showing under the black grip top
    board(4, p.primary, ` stroke="${p.background}" stroke-width="2.4"`) +
    board(0, p.background, ` stroke="${p.primary}" stroke-width="2.6"`) +
    `<path d="M${project(24, 60).join(' ')} L${project(76, 60).join(' ')}" stroke="${p.textPrimary}" stroke-opacity="0.7" stroke-width="0.9" stroke-linecap="round"/>` +
    [project(25, 45), project(25, 55), project(75, 45), project(75, 55)]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9" fill="${p.textPrimary}"/>`)
      .join('');

  return sticker('sls', p, scene);
}

/**
 * Barcelona: the Sagrada Família stickered in black against the logo's
 * equaliser skyline, with its tower crane and a brush-stroke street.
 */
function barcelonaXml(p: IllustrationPalette): string {
  const spire = (x: number, top: number, w: number) => {
    const base = 78;
    const h = w / 2;
    return (
      `<path d="M${x - h} ${base} C${x - h} ${top + 16} ${n(x - h * 0.3)} ${top + 5} ${x} ${top} ` +
      `C${n(x + h * 0.3)} ${top + 5} ${x + h} ${top + 16} ${x + h} ${base} Z" ` +
      `fill="${p.background}" stroke="${p.primary}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<circle cx="${x}" cy="${top - 1.8}" r="2" fill="${p.primary}" stroke="${p.background}" stroke-width="0.8"/>` +
      [0.3, 0.5, 0.7]
        .map((f) => `<rect x="${n(x - 0.8)}" y="${n(top + (base - top) * f)}" width="1.6" height="3.4" rx="0.8" fill="${p.textPrimary}"/>`)
        .join('')
    );
  };

  const scene =
    equaliser(6, 94, 64, 36, p.primary, 21) +
    specks(80, 30, 14, 16, p.primary, 22) +
    // crane
    `<g stroke="${p.textPrimary}" stroke-width="1.1" fill="none" stroke-linecap="round">` +
    `<path d="M82 78 V20 M66 23 H96 M82 15 L70 23 M82 15 L96 23 M73 23 V32"/>` +
    `<path d="M80 28 L84 34 M84 28 L80 34 M80 40 L84 46 M84 40 L80 46 M80 52 L84 58 M84 52 L80 58" stroke-width="0.6"/>` +
    `</g>` +
    spire(26, 42, 8) +
    spire(66, 42, 8) +
    spire(35, 28, 9) +
    spire(57, 28, 9) +
    spire(46, 14, 12) +
    `<path d="M46 2.5 V10 M43 5.6 H49" stroke="${p.textPrimary}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M18 78 V67 Q46 58 74 67 V78 Z" fill="${p.background}" stroke="${p.primary}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<circle cx="46" cy="69.5" r="3.2" fill="${p.primary}" stroke="${p.background}" stroke-width="0.8"/>` +
    `<rect x="0" y="78" width="100" height="22" fill="${p.background}"/>` +
    brush(48, 83, 84, 7, -3, p.primary, 23) +
    brush(58, 91, 50, 4, -2, p.textPrimary, 24, 0.9);

  return sticker('slb', p, scene);
}

/** Podcast: the logo's own vintage mic — slotted capsule, yoke, sparks. */
function podcastXml(p: IllustrationPalette): string {
  const id = 'slm';
  const slots = Array.from(
    { length: 8 },
    (_, i) => `<rect x="38" y="${n(17 + i * 4)}" width="24" height="2" rx="1" fill="${p.background}"/>`,
  ).join('');
  const defs = `<clipPath id="${id}-head"><rect x="36" y="12" width="28" height="40" rx="14"/></clipPath>`;

  const scene =
    equaliser(4, 30, 74, 22, p.primary, 31) +
    specks(76, 70, 12, 18, p.primary, 32) +
    bolt(80, 28, 1.1, 25, p.primary, p.background) +
    bolt(86, 42, 0.9, 40, p.primary, p.background) +
    `<path d="M76 54 L84 56 M75 61 L82 65 M22 30 L15 26 M20 40 L13 40" stroke="${p.primary}" stroke-width="1.8" stroke-linecap="round"/>` +
    brush(52, 86, 70, 7, -4, p.textPrimary, 33, 0.95) +
    `<g transform="rotate(-10 50 50)">` +
    // yoke: black outline under a yellow stroke, sticker style
    `<path d="M31 34 V44 A19 19 0 0 0 69 44 V34" fill="none" stroke="${p.background}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M31 34 V44 A19 19 0 0 0 69 44 V34" fill="none" stroke="${p.primary}" stroke-width="3.2" stroke-linecap="round"/>` +
    `<circle cx="31" cy="44" r="3" fill="${p.textPrimary}" stroke="${p.background}" stroke-width="1.2"/>` +
    `<circle cx="69" cy="44" r="3" fill="${p.textPrimary}" stroke="${p.background}" stroke-width="1.2"/>` +
    // neck
    `<rect x="45" y="60" width="10" height="20" rx="2" fill="${p.primary}" stroke="${p.background}" stroke-width="1.6"/>` +
    `<rect x="44" y="66" width="12" height="3" rx="1" fill="${p.textPrimary}" stroke="${p.background}" stroke-width="1"/>` +
    `<circle cx="50" cy="74" r="2" fill="${p.background}"/>` +
    // capsule: yellow with a white lit side, black slots
    `<rect x="36" y="12" width="28" height="40" rx="14" fill="${p.primary}"/>` +
    `<g clip-path="url(#${id}-head)">` +
    `<rect x="36" y="12" width="10" height="40" fill="${p.textPrimary}"/>` +
    `<rect x="46" y="12" width="3" height="40" fill="${p.textPrimary}" fill-opacity="0.5"/>` +
    slots +
    `</g>` +
    `<rect x="36" y="12" width="28" height="40" rx="14" fill="none" stroke="${p.background}" stroke-width="2.2"/>` +
    `<rect x="34.5" y="50" width="31" height="6" rx="2" fill="${p.primary}" stroke="${p.background}" stroke-width="1.6"/>` +
    `<path d="M38 60 H62 L58 56 H42 Z" fill="${p.background}"/>` +
    `</g>`;

  return sticker(id, p, scene, defs);
}

/**
 * Places: a pin dropped on Barcelona's Eixample grid, the Diagonal painted
 * across it in one white stroke.
 */
function placesXml(p: IllustrationPalette): string {
  const block = (x: number, y: number, s = 16, c = 4.5) =>
    `<path d="M${x + c} ${y} H${x + s - c} L${x + s} ${y + c} V${y + s - c} L${x + s - c} ${y + s} H${x + c} L${x} ${y + s - c} V${y + c} Z"/>`;
  const blocks: string[] = [];
  for (let row = -1; row < 5; row++) {
    for (let col = -1; col < 5; col++) blocks.push(block(col * 22 + 3, row * 22 + 3));
  }
  const pin = 'M50 77 C43 65 31 55.5 31 40.5 A19 19 0 0 1 69 40.5 C69 55.5 57 65 50 77 Z';
  const rays = [200, 235, 305, 340]
    .map((deg) => {
      const [x1, y1] = polar(50, 79, 13, deg + 180);
      const [x2, y2] = polar(50, 79, 18, deg + 180);
      return `M${x1} ${y1} L${x2} ${y2}`;
    })
    .join(' ');

  const scene =
    `<g fill="none" stroke="${p.primary}" stroke-opacity="0.28" stroke-width="0.9">${blocks.join('')}</g>` +
    brush(50, 62, 118, 9, -28, p.textPrimary, 41, 0.9) +
    specks(24, 76, 14, 20, p.primary, 42) +
    `<ellipse cx="50" cy="79" rx="10" ry="3" fill="${p.primary}" stroke="${p.background}" stroke-width="1.2"/>` +
    `<path d="${rays}" stroke="${p.primary}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="${pin}" fill="none" stroke="${p.background}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="${pin}" fill="${p.primary}"/>` +
    `<path d="M36 36 C37 28 42 24 47 23" fill="none" stroke="${p.textPrimary}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M50 77 C57 65 69 55.5 69 40.5" fill="none" stroke="${p.primaryPressed}" stroke-width="2"/>` +
    `<circle cx="50" cy="41" r="8" fill="${p.background}"/>` +
    `<circle cx="50" cy="41" r="3" fill="${p.textPrimary}"/>` +
    bolt(78, 26, 1, 25, p.primary, p.background);

  return sticker('slp', p, scene);
}

const SCENE_BUILDERS: Record<DrawnScene, (p: IllustrationPalette) => string> = {
  skate: skateXml,
  barcelona: barcelonaXml,
  podcast: podcastXml,
  places: placesXml,
};

export function sceneXml(scene: DrawnScene, p: IllustrationPalette): string {
  return SCENE_BUILDERS[scene](p);
}

/**
 * Skateboard wheel, face on — the atom's electrons, in the icon's gold:
 * yellow urethane with a heavy black outline, a black core and a white
 * bearing. A lightning bolt printed on the tyre makes the roll readable.
 * No highlight: that's `wheelShineXml`, layered on top and kept still so
 * the light doesn't spin with the wheel.
 */
export function wheelXml(p: IllustrationPalette): string {
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const [x1, y1] = polar(50, 50, 7, i * 60);
    const [x2, y2] = polar(50, 50, 14, i * 60);
    return `M${x1} ${y1} L${x2} ${y2}`;
  }).join(' ');

  return svg(
    `<circle cx="50" cy="50" r="45" fill="${p.primary}" stroke="${p.background}" stroke-width="6"/>` +
      `<circle cx="50" cy="50" r="36" fill="none" stroke="${p.primaryPressed}" stroke-width="3"/>` +
      bolt(50, 19, 1, 90, p.background, p.background) +
      `<circle cx="50" cy="50" r="27" fill="${p.background}"/>` +
      `<circle cx="50" cy="50" r="17" fill="${p.textPrimary}" stroke="${p.background}" stroke-width="2.5"/>` +
      `<path d="${spokes}" stroke="${p.background}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<circle cx="50" cy="50" r="5" fill="${p.background}"/>`,
  );
}

/** Static highlight for a wheel: sits over it and doesn't rotate. */
export function wheelShineXml(p: IllustrationPalette): string {
  return svg(
    `<path d="${arc(50, 50, 39, 200, 250)}" fill="none" stroke="${p.textPrimary}" stroke-opacity="0.85" stroke-width="4.5" stroke-linecap="round"/>` +
      `<path d="${arc(50, 50, 39, 258, 266)}" fill="none" stroke="${p.textPrimary}" stroke-opacity="0.7" stroke-width="4.5" stroke-linecap="round"/>`,
  );
}

/**
 * The nucleus: a big skateboard wheel whose hub is left open for the
 * current scene. Yellow urethane tyre with a heavy black outline, a bevel,
 * printed lightning bolts and tread marks (these turn with the tyre, which
 * is what makes it read as rolling), then the black core lip that frames
 * the scene. On the same 100×100 canvas; the open hub is `NUCLEUS_HUB` of
 * the diameter.
 */
export const NUCLEUS_HUB = 0.66;

export function nucleusWheelXml(p: IllustrationPalette): string {
  const bolts = [0, 120, 240]
    .map((deg) => {
      const [x, y] = polar(50, 50, 41.5, deg - 90);
      return bolt(x, y, 0.95, deg + 90, p.background, p.background);
    })
    .join('');
  const treads = [0, 120, 240]
    .flatMap((deg) => [deg + 38, deg + 60, deg + 82])
    .map((deg) => `<path d="${arc(50, 50, 41.5, deg - 4, deg + 4)}" stroke="${p.background}" stroke-opacity="0.4" stroke-width="2.2" stroke-linecap="round" fill="none"/>`)
    .join('');

  return svg(
    // tyre, outlined inside and out
    `<circle cx="50" cy="50" r="41.5" fill="none" stroke="${p.primary}" stroke-width="13"/>` +
      `<circle cx="50" cy="50" r="47.5" fill="none" stroke="${p.background}" stroke-width="2.6"/>` +
      `<circle cx="50" cy="50" r="38" fill="none" stroke="${p.primaryPressed}" stroke-width="2.4"/>` +
      bolts +
      treads +
      // core lip framing the hub
      `<circle cx="50" cy="50" r="34.2" fill="none" stroke="${p.background}" stroke-width="3.6"/>` +
      `<circle cx="50" cy="50" r="32.3" fill="none" stroke="${p.textPrimary}" stroke-opacity="0.55" stroke-width="0.7"/>`,
  );
}

/** Static highlight for the nucleus tyre: sits over it and doesn't rotate. */
export function nucleusShineXml(p: IllustrationPalette): string {
  return svg(
    `<path d="${arc(50, 50, 44, 198, 248)}" fill="none" stroke="${p.textPrimary}" stroke-opacity="0.8" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="${arc(50, 50, 44, 256, 263)}" fill="none" stroke="${p.textPrimary}" stroke-opacity="0.65" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="${arc(50, 50, 44, 20, 75)}" fill="none" stroke="${p.background}" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round"/>`,
  );
}

/**
 * The three orbit rings behind the nucleus, React-logo style, on the same
 * 100×100 canvas: ellipses of 84×34 fanned at 0°, 60° and 120°.
 */
export function orbitsXml(p: IllustrationPalette, orbitCount = 3): string {
  return svg(
    Array.from(
      { length: orbitCount },
      (_, i) =>
        `<ellipse cx="50" cy="50" rx="42" ry="17" transform="rotate(${n((i * 180) / orbitCount)} 50 50)" ` +
        `fill="none" stroke="${p.primary}" stroke-opacity="0.6" stroke-width="1.3"/>`,
    ).join(''),
  );
}
