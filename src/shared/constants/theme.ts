/**
 * Skateboard's dark brand palette — see .docs/README-skateboard-dark-ux-design.md.
 * Dark-only by design (black/charcoal + skate yellow + white); there is no
 * light variant. There are many other ways to style your app. For example,
 * [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/),
 * [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/shared/constants/global.css';

import { Platform } from 'react-native';

export const Colors = {
  background: '#080808',
  backgroundSecondary: '#101010',
  surface: '#171717',
  surfaceElevated: '#202020',
  border: '#292929',

  primary: '#FFD400',
  primarySoft: 'rgba(255,212,0,0.14)',
  onPrimary: '#080808',

  textPrimary: '#F5F5F4',
  textSecondary: '#A0A0A0',
  textMuted: '#707070',
  textDisabled: '#505050',

  destructive: '#FF5A52',
  success: '#32D74B',
  warning: '#FFD400',
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Not consumed by any screen yet (no social-link UI built), carried over
  // for when one exists.
  spotify: '#1DB954',
  youtube: '#FF0000',
} as const;

export type ThemeColor = keyof typeof Colors;

// Single source of truth for corner radii.
export const RADII = {
  card: 16,
  control: 12,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// `three` (16) and `four` (24) already sit inside the doc's row-padding
// (14–18px) and section-gap (20–28px) ranges — screen horizontal padding
// uses `four`, which also covers the doc's 20–24px recommendation.
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

// Display/headline font — loaded once in the root layout via useFonts
// (@expo-google-fonts/fraunces). Body/small/code text stay on the system
// font (see `Fonts` above), no custom loading needed for those.
export const DisplayFontFamily = 'Fraunces_700Bold';

// Caps content width on wide viewports (web desktop, tablets in landscape)
// so screens don't stretch full-bleed. Native phone widths sit well under
// both values, so these only ever engage on tablet/web.
export const MAX_FORM_WIDTH = 480;
export const MAX_CONTENT_WIDTH = 720;

// Viewport widths at or below this are treated as a phone-sized browser window.
export const MOBILE_WEB_MAX_WIDTH = 768;
