import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface ErrorBannerProps {
  message: string;
  /**
   * Optional raw error text (e.g. a non-BffError's `.message`) shown below
   * the friendly message in muted small type — for diagnosing an error that
   * isn't a recognized BffError without exposing internals as the primary
   * copy. Remove once the underlying issue is identified and fixed.
   */
  detail?: string;
  onRetry?: () => void;
}

/** Renders a shared/api/errors BffError (or any Error) message with an optional retry action. */
export function ErrorBanner({ message, detail, onRetry }: ErrorBannerProps) {
  const { t } = useTranslation();
  return (
    <ThemedView type="surface" style={styles.container}>
      <ThemedText type="small" themeColor="destructive">
        {message}
      </ThemedText>
      {detail && (
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      )}
      {onRetry && (
        <Pressable onPress={onRetry}>
          <ThemedText type="linkPrimary">{t('common.retry')}</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    borderRadius: RADII.card,
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
  },
});
