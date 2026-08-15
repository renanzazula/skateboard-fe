import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  disabled?: boolean;
};

/** Secondary action — surface bg / border, per doc §8. */
export function SecondaryButton({ title, disabled, ...rest }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && !disabled && styles.pressed,
      ]}
      {...rest}>
      <ThemedText type="smallBold" themeColor={disabled ? 'textDisabled' : 'textPrimary'}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: RADII.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});
