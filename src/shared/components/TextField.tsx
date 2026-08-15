import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label?: string;
  error?: string;
};

/** Labeled text input, per doc §9 — surface bg, muted border, yellow focus ring on error/normal handled by caller state if needed. */
export function TextField({ label, error, ...rest }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          { color: theme.textPrimary, borderColor: error ? theme.destructive : theme.border, backgroundColor: theme.surface },
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText type="small" themeColor="destructive">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
    width: '100%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
