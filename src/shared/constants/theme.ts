/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/shared/constants/global.css';

import { Platform } from 'react-native';

// Brand colors — identical in both modes. Not consumed by any screen yet
// (no social-link UI built), carried over for when one exists.
const BRAND = {
  spotify: '#1DB954',
  youtube: '#FF0000',
} as const;

export const Colors = {
  dark: {
    background: '#0B0B0C',
    surface: '#151517',
    surfaceHigh: '#1D1D20',
    border: 'rgba(255,255,255,0.07)',
    accent: '#F2A900',
    accentSoft: 'rgba(242,169,0,0.14)',
    onAccent: '#1A1A1C',
    text: '#F5F5F4',
    textDim: '#9C9C9F',
    textFaint: '#6B6B6E',
    danger: '#FF6B6B',
    success: '#32D74B',
    warning: '#FFD60A',
    shadow: 'rgba(0, 0, 0, 0.3)',
    ...BRAND,
  },
  light: {
    background: '#FAFAF8',
    surface: '#FFFFFF',
    surfaceHigh: '#F2F2F0',
    border: 'rgba(0,0,0,0.08)',
    accent: '#D99400',
    accentSoft: 'rgba(217,148,0,0.12)',
    onAccent: '#1A1A1C',
    text: '#1A1A1C',
    textDim: '#6E6E72',
    textFaint: '#9A9A9E',
    danger: '#D64545',
    success: '#34C759',
    warning: '#FFCC00',
    shadow: 'rgba(0, 0, 0, 0.06)',
    ...BRAND,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Single source of truth for corner radii.
export const RADII = {
  card: 18,
  control: 14,
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
