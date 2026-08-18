import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/shared/hooks/use-theme';

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
    paddingTop: 18,
    paddingBottom: 6,
  },
});
