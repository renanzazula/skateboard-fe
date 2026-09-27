/**
 * SkateLoader artwork as SVG markup, rendered through react-native-svg's
 * `SvgXml`. Kept as plain strings (no react-native imports) so the same
 * markup can be unit-tested here and opened directly in a browser to review
 * the artwork. Every colour comes from the palette argument: pass the theme's
 * `Colors` and `IllustrationColors` in, never hex literals.
 *
 * All pieces are drawn on a 64×64 canvas, lit from the top left.
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
};

export type OrbitIllustration = 'deck' | 'barcelona' | 'mic' | 'pin';

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;

/** A urethane gradient shared by the loader wheel and the deck's wheels. */
const urethaneStops = (p: IllustrationPalette) =>
  `<stop offset="0" stop-color="${p.urethaneLight}"/>` +
  `<stop offset="0.55" stop-color="${p.primary}"/>` +
  `<stop offset="1" stop-color="${p.urethaneDark}"/>`;

const metalStops = (p: IllustrationPalette) =>
  `<stop offset="0" stop-color="${p.metalLight}"/>` +
  `<stop offset="0.6" stop-color="${p.metalMid}"/>` +
  `<stop offset="1" stop-color="${p.metalDark}"/>`;

/**
 * Point on a circle, for arcs. Angles in degrees, 0 = 3 o'clock, clockwise.
 */
function polar(cx: number, cy: number, r: number, deg: number): string {
  const rad = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(rad)).toFixed(2)} ${(cy + r * Math.sin(rad)).toFixed(2)}`;
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${polar(cx, cy, r, from)} A${r} ${r} 0 ${large} 1 ${polar(cx, cy, r, to)}`;
}

/**
 * Skateboard wheel, face on: urethane tyre with a printed graphic (the mark
 * that makes the spin readable), a riding lip, a dark core and a steel
 * bearing with its shield rings and axle nut. No lighting highlight here —
 * that's `wheelShineXml`, drawn over the top and kept still so the light
 * doesn't spin with the wheel.
 */
export function wheelXml(p: IllustrationPalette): string {
  const bearingBalls = Array.from({ length: 8 }, (_, i) => {
    const [x, y] = polar(32, 32, 9.5, i * 45).split(' ');
    return `<circle cx="${x}" cy="${y}" r="1.2" fill="${p.metalDark}" fill-opacity="0.55"/>`;
  }).join('');

  return svg(
    `<defs>` +
      `<radialGradient id="slw-ure" cx="0.35" cy="0.3" r="0.8">${urethaneStops(p)}</radialGradient>` +
      `<radialGradient id="slw-core" cx="0.4" cy="0.35" r="0.75">` +
      `<stop offset="0" stop-color="${p.surfaceElevated}"/><stop offset="1" stop-color="${p.background}"/>` +
      `</radialGradient>` +
      `<radialGradient id="slw-steel" cx="0.35" cy="0.3" r="0.85">${metalStops(p)}</radialGradient>` +
      `</defs>` +
      // tyre + worn riding edge
      `<circle cx="32" cy="32" r="31" fill="url(#slw-ure)"/>` +
      `<circle cx="32" cy="32" r="30.2" fill="none" stroke="${p.urethaneDark}" stroke-opacity="0.6" stroke-width="1.6"/>` +
      // printed graphic on the tyre: an arc band + a dot
      `<path d="${arc(32, 32, 25.5, 200, 290)}" fill="none" stroke="${p.background}" stroke-opacity="0.55" stroke-width="3.2" stroke-linecap="round"/>` +
      `<circle cx="${polar(32, 32, 25.5, 315).split(' ')[0]}" cy="${polar(32, 32, 25.5, 315).split(' ')[1]}" r="1.7" fill="${p.background}" fill-opacity="0.55"/>` +
      // lip where the tyre slopes into the core
      `<circle cx="32" cy="32" r="20.5" fill="none" stroke="${p.urethaneDark}" stroke-opacity="0.7" stroke-width="1.4"/>` +
      // core
      `<circle cx="32" cy="32" r="18" fill="url(#slw-core)"/>` +
      // bearing
      `<circle cx="32" cy="32" r="13" fill="url(#slw-steel)" stroke="${p.metalDark}" stroke-width="0.8"/>` +
      bearingBalls +
      `<circle cx="32" cy="32" r="7.5" fill="none" stroke="${p.metalDark}" stroke-opacity="0.5" stroke-width="0.8"/>` +
      // axle nut (hex) + axle end
      `<path d="M${polar(32, 32, 4.6, 0)} L${polar(32, 32, 4.6, 60)} L${polar(32, 32, 4.6, 120)} L${polar(32, 32, 4.6, 180)} L${polar(32, 32, 4.6, 240)} L${polar(32, 32, 4.6, 300)} Z" fill="${p.metalMid}" stroke="${p.metalDark}" stroke-width="0.8"/>` +
      `<circle cx="32" cy="32" r="2" fill="${p.metalDark}"/>`,
  );
}

/** Static specular light for the wheel: sits over it and doesn't rotate. */
export function wheelShineXml(p: IllustrationPalette): string {
  return svg(
    `<path d="${arc(32, 32, 27.5, 195, 250)}" fill="none" stroke="${p.shine}" stroke-opacity="0.55" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="${arc(32, 32, 27.5, 258, 266)}" fill="none" stroke="${p.shine}" stroke-opacity="0.45" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="${arc(32, 32, 11, 200, 245)}" fill="none" stroke="${p.shine}" stroke-opacity="0.7" stroke-width="1.4" stroke-linecap="round"/>` +
      `<path d="${arc(32, 32, 29, 20, 80)}" fill="none" stroke="${p.shadow}" stroke-opacity="0.25" stroke-width="2.6" stroke-linecap="round"/>`,
  );
}

/** Skate: a maple deck mid-ollie, grip tape on top, steel trucks, urethane wheels. */
function deckXml(p: IllustrationPalette): string {
  const truck = (x: number) =>
    `<rect x="${x - 5}" y="34.2" width="10" height="2" rx="0.6" fill="${p.metalDark}"/>` +
    `<path d="M${x - 7} 36.2 H${x + 7} L${x + 4.5} 40.5 H${x - 4.5} Z" fill="url(#sld-steel)"/>` +
    `<circle cx="${x}" cy="44" r="5.6" fill="url(#sld-ure)"/>` +
    `<circle cx="${x}" cy="44" r="2.3" fill="${p.metalMid}" stroke="${p.metalDark}" stroke-width="0.6"/>` +
    `<path d="${arc(x, 44, 4.2, 200, 260)}" fill="none" stroke="${p.shine}" stroke-opacity="0.6" stroke-width="1" stroke-linecap="round"/>`;

  return svg(
    `<defs>` +
      `<linearGradient id="sld-maple" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${p.mapleLight}"/><stop offset="1" stop-color="${p.mapleDark}"/>` +
      `</linearGradient>` +
      `<linearGradient id="sld-steel" x1="0" y1="0" x2="0" y2="1">${metalStops(p)}</linearGradient>` +
      `<radialGradient id="sld-ure" cx="0.35" cy="0.3" r="0.8">${urethaneStops(p)}</radialGradient>` +
      `</defs>` +
      `<ellipse cx="32" cy="57" rx="21" ry="2.4" fill="${p.shadow}" fill-opacity="0.45"/>` +
      `<g transform="rotate(-12 32 38)">` +
      // ply edge, with laminate lines
      `<path d="M3 24 C5 30 9 31 13 31 H51 C55 31 59 30 61 24 L62 25.6 C59.6 32.6 55.2 34.4 51 34.4 H13 C8.8 34.4 4.4 32.6 2 25.6 Z" fill="url(#sld-maple)"/>` +
      `<path d="M4 26.6 C6.4 31.4 9.6 32.6 13 32.6 H51 C54.4 32.6 57.6 31.4 60 26.6" fill="none" stroke="${p.mapleDark}" stroke-opacity="0.6" stroke-width="0.5"/>` +
      // grip-taped top face, seen slightly from above, with the truck bolts
      `<path d="M3 24 C5 30 9 31 13 31 H51 C55 31 59 30 61 24 C58.5 25.4 55 25.8 51 25.8 H13 C9 25.8 5.5 25.4 3 24 Z" fill="${p.gripTape}" stroke="${p.gripTape}" stroke-width="0.8" stroke-linejoin="round"/>` +
      `<path d="M6 25.6 C9 26.6 11 26.8 13 26.8 H51 C53 26.8 55 26.6 58 25.6" fill="none" stroke="${p.shine}" stroke-opacity="0.12" stroke-width="0.8"/>` +
      [13.5, 18.5, 45.5, 50.5]
        .map((x) => `<circle cx="${x}" cy="28.4" r="0.75" fill="${p.metalMid}"/>`)
        .join('') +
      truck(16) +
      truck(48) +
      `</g>`,
  );
}

/** Podcast: a studio condenser mic — chrome mesh grille, brand band, shock mount. */
function micXml(p: IllustrationPalette): string {
  const meshH = Array.from({ length: 9 }, (_, i) => `<line x1="20" y1="${6 + i * 3}" x2="44" y2="${6 + i * 3}"/>`).join('');
  const meshV = Array.from({ length: 8 }, (_, i) => `<line x1="${23 + i * 3}" y1="3" x2="${23 + i * 3}" y2="31"/>`).join('');

  return svg(
    `<defs>` +
      `<linearGradient id="slm-chrome" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${p.metalDark}"/><stop offset="0.3" stop-color="${p.metalLight}"/>` +
      `<stop offset="0.65" stop-color="${p.metalMid}"/><stop offset="1" stop-color="${p.metalDark}"/>` +
      `</linearGradient>` +
      `<linearGradient id="slm-body" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${p.background}"/><stop offset="0.35" stop-color="${p.metalDark}"/>` +
      `<stop offset="1" stop-color="${p.background}"/>` +
      `</linearGradient>` +
      `<linearGradient id="slm-band" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${p.urethaneDark}"/><stop offset="0.35" stop-color="${p.urethaneLight}"/>` +
      `<stop offset="1" stop-color="${p.primaryPressed}"/>` +
      `</linearGradient>` +
      `<clipPath id="slm-grille"><rect x="22" y="4" width="20" height="26" rx="10"/></clipPath>` +
      `</defs>` +
      `<ellipse cx="32" cy="60" rx="13" ry="2" fill="${p.shadow}" fill-opacity="0.45"/>` +
      // stand
      `<rect x="30.5" y="46" width="3" height="11" fill="url(#slm-body)"/>` +
      `<ellipse cx="32" cy="57.5" rx="10" ry="2.2" fill="${p.metalDark}"/>` +
      // shock-mount yoke behind the body
      `<path d="M15 20 V29 A17 17 0 0 0 49 29 V20" fill="none" stroke="${p.metalMid}" stroke-width="2.4" stroke-linecap="round"/>` +
      // grille + mesh
      `<rect x="22" y="4" width="20" height="26" rx="10" fill="url(#slm-chrome)"/>` +
      `<g clip-path="url(#slm-grille)" stroke="${p.metalDark}" stroke-opacity="0.5" stroke-width="0.55">${meshH}${meshV}</g>` +
      `<rect x="22" y="4" width="20" height="26" rx="10" fill="none" stroke="${p.metalDark}" stroke-width="0.8"/>` +
      // brand band + body
      `<rect x="21.5" y="28.5" width="21" height="4" rx="1.2" fill="url(#slm-band)"/>` +
      `<path d="M23 32.5 H41 L39.5 45 Q39.3 46.5 37.8 46.5 H26.2 Q24.7 46.5 24.5 45 Z" fill="url(#slm-body)"/>` +
      `<circle cx="32" cy="38" r="1.3" fill="${p.primary}"/>` +
      // highlight down the grille
      `<rect x="26" y="7" width="2.6" height="19" rx="1.3" fill="${p.shine}" fill-opacity="0.45"/>`,
  );
}

/**
 * Barcelona: the Sagrada Família — parabolic sandstone spires with their
 * coloured finials, the tall central tower with its cross, the Nativity
 * portals and rose window, and the construction crane that's been part of
 * the skyline for as long as anyone can remember.
 */
function barcelonaXml(p: IllustrationPalette): string {
  const spire = (x: number, top: number, w: number) => {
    const base = 42;
    const half = w / 2;
    const slits = Array.from({ length: 3 }, (_, i) => {
      const y = top + 8 + i * ((base - top - 10) / 3);
      return `<rect x="${x - 0.6}" y="${y.toFixed(1)}" width="1.2" height="3" rx="0.6" fill="${p.stoneDark}" fill-opacity="0.8"/>`;
    }).join('');
    return (
      `<path d="M${x - half} ${base} C${x - half} ${top + 14} ${x - half * 0.35} ${top + 4} ${x} ${top} C${x + half * 0.35} ${top + 4} ${x + half} ${top + 14} ${x + half} ${base} Z" fill="url(#slb-stone)"/>` +
      `<path d="M${x - half * 0.55} ${base} C${x - half * 0.55} ${top + 14} ${x - half * 0.2} ${top + 5} ${x} ${top + 1}" fill="none" stroke="${p.shine}" stroke-opacity="0.35" stroke-width="0.8"/>` +
      slits +
      `<circle cx="${x}" cy="${top - 1}" r="1.5" fill="${p.primary}"/>`
    );
  };

  return svg(
    `<defs>` +
      `<linearGradient id="slb-stone" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${p.stoneLight}"/><stop offset="0.55" stop-color="${p.stoneMid}"/>` +
      `<stop offset="1" stop-color="${p.stoneDark}"/>` +
      `</linearGradient>` +
      `<radialGradient id="slb-sun" cx="0.5" cy="0.5" r="0.5">` +
      `<stop offset="0" stop-color="${p.urethaneLight}" stop-opacity="0.85"/><stop offset="1" stop-color="${p.primary}" stop-opacity="0"/>` +
      `</radialGradient>` +
      `</defs>` +
      `<circle cx="44" cy="24" r="14" fill="url(#slb-sun)"/>` +
      // crane
      `<g stroke="${p.metalMid}" stroke-width="0.9" fill="none">` +
      `<line x1="57" y1="7" x2="57" y2="42"/><line x1="44" y1="9" x2="62" y2="9"/>` +
      `<line x1="57" y1="4" x2="47" y2="9"/><line x1="57" y1="4" x2="62" y2="9"/>` +
      `<line x1="49" y1="9" x2="49" y2="15"/>` +
      `</g>` +
      spire(12, 20, 7) +
      spire(52, 20, 7) +
      spire(21, 11, 8) +
      spire(43, 11, 8) +
      spire(32, 5, 10) +
      // central cross
      `<path d="M32 0.8 V4.6 M30.3 2.3 H33.7" stroke="${p.primary}" stroke-width="1.3" stroke-linecap="round"/>` +
      // facade, portals, rose window
      `<rect x="6" y="41" width="52" height="17" rx="1.2" fill="url(#slb-stone)"/>` +
      `<rect x="6" y="41" width="52" height="1.4" fill="${p.stoneDark}" fill-opacity="0.6"/>` +
      `<path d="M12 58 V51 A4 4 0 0 1 20 51 V58 Z M44 58 V51 A4 4 0 0 1 52 51 V58 Z" fill="${p.stoneDark}"/>` +
      `<path d="M26.5 58 V50 A5.5 5.5 0 0 1 37.5 50 V58 Z" fill="${p.background}" fill-opacity="0.85"/>` +
      `<circle cx="32" cy="47" r="3.4" fill="${p.metalDark}" stroke="${p.stoneLight}" stroke-width="0.8"/>` +
      `<circle cx="32" cy="47" r="1.3" fill="${p.primary}"/>` +
      `<ellipse cx="32" cy="60" rx="27" ry="1.8" fill="${p.shadow}" fill-opacity="0.4"/>`,
  );
}

/** Places: a glossy 3D map pin dropped on the spot. */
function pinXml(p: IllustrationPalette): string {
  return svg(
    `<defs>` +
      `<radialGradient id="slp-body" cx="0.35" cy="0.25" r="0.9">${urethaneStops(p)}</radialGradient>` +
      `<radialGradient id="slp-hole" cx="0.5" cy="0.35" r="0.7">` +
      `<stop offset="0" stop-color="${p.surfaceElevated}"/><stop offset="1" stop-color="${p.background}"/>` +
      `</radialGradient>` +
      `</defs>` +
      `<ellipse cx="32" cy="58" rx="10" ry="2.6" fill="${p.shadow}" fill-opacity="0.5"/>` +
      `<ellipse cx="32" cy="58" rx="4" ry="1.1" fill="${p.primary}" fill-opacity="0.35"/>` +
      `<path d="M32 57 C26 47 15 38.5 15 25 A17 17 0 0 1 49 25 C49 38.5 38 47 32 57 Z" fill="url(#slp-body)"/>` +
      `<path d="M32 57 C38 47 49 38.5 49 25" fill="none" stroke="${p.urethaneDark}" stroke-width="1.2" stroke-opacity="0.8"/>` +
      `<circle cx="32" cy="25" r="7.5" fill="url(#slp-hole)"/>` +
      `<circle cx="32" cy="25" r="7.5" fill="none" stroke="${p.urethaneDark}" stroke-width="1"/>` +
      `<circle cx="32" cy="25" r="2.4" fill="${p.primary}"/>` +
      `<ellipse cx="24.5" cy="17.5" rx="3.2" ry="5.5" transform="rotate(35 24.5 17.5)" fill="${p.shine}" fill-opacity="0.45"/>`,
  );
}

const ORBIT_BUILDERS: Record<OrbitIllustration, (p: IllustrationPalette) => string> = {
  deck: deckXml,
  barcelona: barcelonaXml,
  mic: micXml,
  pin: pinXml,
};

export function orbitIllustrationXml(kind: OrbitIllustration, p: IllustrationPalette): string {
  return ORBIT_BUILDERS[kind](p);
}
