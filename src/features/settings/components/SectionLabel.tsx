import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/shared/hooks/use-theme';

/**
 * Space above a section label, and therefore the gap between one section's
 * card and the next. SettingsSection reuses it for sections with no label,
 * which would otherwise butt straight up against the card above them.
 */
export const SECTION_GAP = 18;

type Props = {
  label: string;
  danger?: boolean;
};

/** Uppercase section label, gold by default, destructive-tinted for a Danger Zone header. See .docs/SETTINGS_REDESIGN_2.md §4/§6. */
export function SectionLabel({ label, danger }: Props) {
  const theme = useTheme();

  return <Text style={[styles.label, { color: danger ? theme.destructive : theme.primary }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.09 * 12,
    paddingTop: SECTION_GAP,
    paddingBottom: 6,
    // Nudged in so the label doesn't sit flush against its card's left edge.
    paddingLeft: 4,
  },
});
