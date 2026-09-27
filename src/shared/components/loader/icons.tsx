import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

// Loader glyphs, drawn on lucide's 24×24 grid with its stroke conventions
// (width 2, round caps/joins) so they sit alongside the rest of the app's icons.
type IconProps = { size: number; color: string };

const stroke = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** The podcast: a studio microphone. */
export function MicGlyph({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Rect x={9} y={2} width={6} height={12} rx={3} />
      <Path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <Line x1={12} y1={18} x2={12} y2={22} />
      <Line x1={8} y1={22} x2={16} y2={22} />
    </Svg>
  );
}

/** Skate: a deck seen from the side, kicktails up, two wheels. */
export function DeckGlyph({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M2 10.5c.8 1.6 1.9 2.5 3.5 2.5h13c1.6 0 2.7-.9 3.5-2.5" />
      <Line x1={7} y1={13} x2={7} y2={15} />
      <Line x1={17} y1={13} x2={17} y2={15} />
      <Circle cx={7} cy={17.5} r={2} />
      <Circle cx={17} cy={17.5} r={2} />
    </Svg>
  );
}

/** Barcelona: the Sagrada Família's spires. */
export function BarcelonaGlyph({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M5 21V10l1.5-5L8 10v11" />
      <Path d="M10 21V7l2-5 2 5v14" />
      <Path d="M16 21V10l1.5-5L19 10v11" />
      <Line x1={3} y1={21} x2={21} y2={21} />
      <Path d="M11 21v-3a1 1 0 0 1 2 0v3" />
    </Svg>
  );
}

/** Places: a map pin — the spots to skate. */
export function PinGlyph({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <Circle cx={12} cy={10} r={3} />
    </Svg>
  );
}

type WheelProps = { size: number; urethane: string; core: string; bearing: string };

/** A skateboard wheel: urethane tyre, core, and a bearing with spokes so the spin reads. */
export function WheelGlyph({ size, urethane, core, bearing }: WheelProps) {
  const spokes = [0, 60, 120, 180, 240, 300];
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={23} fill={urethane} />
      <Circle cx={24} cy={24} r={23} fill="none" stroke={core} strokeOpacity={0.25} strokeWidth={1} />
      {/* Contact-patch notch — the one asymmetric mark that makes rotation visible. */}
      <Rect x={22} y={2.5} width={4} height={5} rx={2} fill={core} fillOpacity={0.55} />
      <Circle cx={24} cy={24} r={14} fill={core} />
      {spokes.map((deg) => (
        <Line
          key={deg}
          x1={24}
          y1={24}
          x2={24 + 12 * Math.cos((deg * Math.PI) / 180)}
          y2={24 + 12 * Math.sin((deg * Math.PI) / 180)}
          stroke={urethane}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      ))}
      <Circle cx={24} cy={24} r={6.5} fill={bearing} stroke={urethane} strokeWidth={2} />
      <Circle cx={24} cy={24} r={2.5} fill={core} />
    </Svg>
  );
}
