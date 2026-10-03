import { StyleSheet } from 'react-native';

import { PrivacyPolicyView } from '@/features/privacy-policy/components/PrivacyPolicyView';
import { usePrivacyPolicy } from '@/features/privacy-policy/hooks/usePrivacyPolicy';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';

/**
 * Public Privacy Policy page — reached from Settings → About, and also
 * reachable with no login at all (registered as an unguarded top-level route
 * in app/_layout.tsx, outside both Stack.Protected blocks). This is the URL
 * given to Apple/Google app review, so it must not depend on any
 * auth/profile context. Content comes from GET /api/privacy-policy, which is
 * fully anonymous; admins manage it at /settings/privacy-policy-admin.
 */
export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const { page, loading, error, refetch } = usePrivacyPolicy();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('privacyPolicy.title')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('privacyPolicy.title')} />
        <ErrorBanner message={isBffError(error) ? error.message : t('privacyPolicy.loadError')} onRetry={refetch} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('privacyPolicy.title')} />
      <PrivacyPolicyView page={page} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
