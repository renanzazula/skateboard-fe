import { Colors, type ThemeColor } from '@/shared/constants/theme';

/**
 * Resolved color tokens — same shape every screen already reads (`theme.textPrimary`, etc.).
 * The app is dark-only (see .docs/README-skateboard-dark-ux-design.md), so this
 * is just a passthrough; no light/dark mode resolution needed.
 */
export function useTheme(): Record<ThemeColor, string> {
  return Colors;
}
