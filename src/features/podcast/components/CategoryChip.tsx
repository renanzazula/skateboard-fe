import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/shared/hooks/use-theme';
import { RADII } from '@/shared/constants/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function CategoryChip({ label, selected, onPress }: Props) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.chipBg, borderColor: colors.border },
      ]}>
      <Text style={[styles.label, { color: selected ? colors.onPrimary : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: RADII.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});
