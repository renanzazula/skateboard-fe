import { StyleSheet } from 'react-native';

import { TermsView } from '@/features/terms/components/TermsView';
import { useTerms } from '@/features/terms/hooks/useTerms';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';

/**
 * Read-only Terms & Conditions page for every authenticated user, reached
 * from Settings → About. Content comes from GET /api/terms — admins manage
 * it at /settings/terms-admin.
 */
export default function TermsScreen() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { page, loading, error, refetch } = useTerms();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('terms.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('terms.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
        <ErrorBanner message={isBffError(error) ? error.message : t('terms.loadError')} onRetry={refetch} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('terms.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <TermsView page={page} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
