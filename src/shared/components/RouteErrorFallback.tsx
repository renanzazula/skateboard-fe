import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface RouteErrorFallbackProps {
  error: Error;
  retry: () => void;
}

/**
 * Expo Router's error-boundary convention: a route/layout file that exports
 * a component named `ErrorBoundary` has it rendered (with {error, retry})
 * instead of silently crashing to a blank screen when a descendant throws
 * during render — see app/_layout.tsx. Shows the real error message/stack
 * unconditionally (not gated behind __DEV__): a render crash always means a
 * bug, and this is what makes it diagnosable on a device we can't attach a
 * debugger to (e.g. a production/TestFlight build).
 */
export function RouteErrorFallback({ error, retry }: RouteErrorFallbackProps) {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle" themeColor="destructive">
            {t('common.somethingWentWrong')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {error.name}: {error.message}
          </ThemedText>
          {error.stack ? (
            <ThemedText type="code" themeColor="textMuted" style={styles.stack} selectable>
              {error.stack}
            </ThemedText>
          ) : null}
          <PrimaryButton title={t('common.tryAgainAction')} onPress={retry} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  center: { textAlign: 'center' },
  stack: { textAlign: 'left' },
});
