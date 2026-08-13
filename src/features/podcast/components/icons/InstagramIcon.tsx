import Svg, { Circle, Line, Rect } from 'react-native-svg';

// lucide-react-native dropped brand/logo icons (Instagram included) a few
// major versions back, and @expo/vector-icons isn't a dependency of this
// app. This is the classic Feather-style geometric "camera in a rounded
// square" glyph — not Instagram's trademarked logo mark — drawn to match
// lucide's exact stroke conventions (width 2, round caps/joins) so it reads
// as part of the same icon set as the surrounding Calendar/Clock/etc. icons.
type Props = { size?: number; color?: string };

export function InstagramIcon({ size = 16, color = '#000' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={2} width={20} height={20} rx={5} ry={5} />
      <Circle cx={12} cy={12} r={4} />
      <Line x1={17.5} y1={6.5} x2={17.51} y2={6.5} />
    </Svg>
  );
}
