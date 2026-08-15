import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  disabled?: boolean;
};

/** Primary CTA — yellow bg / black text, per doc §8. */
export function PrimaryButton({ title, loading, disabled, ...rest }: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isDisabled ? theme.surfaceElevated : theme.primary },
        pressed && !isDisabled && styles.pressed,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={theme.textMuted} />
      ) : (
        <ThemedText type="smallBold" themeColor={isDisabled ? 'textDisabled' : 'onPrimary'}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: RADII.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.85,
  },
});
