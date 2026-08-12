import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Renders a shared/api/errors BffError (or any Error) message with an optional retry action. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="small">{message}</ThemedText>
      {onRetry && (
        <Pressable onPress={onRetry}>
          <ThemedText type="linkPrimary">Retry</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
  },
});
