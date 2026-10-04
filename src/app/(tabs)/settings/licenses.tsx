import { StyleSheet } from 'react-native';

import { LicensesView } from '@/features/licenses/components/LicensesView';
import { useLicenses } from '@/features/licenses/hooks/useLicenses';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';

/**
 * Read-only Open-source Licenses page for every authenticated user, reached
 * from Settings → About. Content comes from GET /api/licenses — admins
 * manage it at /settings/licenses-admin.
 */
export default function LicensesScreen() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { page, loading, error, refetch } = useLicenses();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('licenses.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('licenses.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
        <ErrorBanner message={isBffError(error) ? error.message : t('licenses.loadError')} onRetry={refetch} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('licenses.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <LicensesView page={page} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
