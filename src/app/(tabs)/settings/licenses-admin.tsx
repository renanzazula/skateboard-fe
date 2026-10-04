import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { LicensesForm } from '@/features/licenses/admin/components/LicensesForm';
import { useLicensesAdmin } from '@/features/licenses/hooks/useLicensesAdmin';
import type { Licenses } from '@/features/licenses/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * Open-source Licenses management, reached from Settings → Administration.
 * Gated by FUNC_LICENSES_MANAGE. Loads the current page (draft or published)
 * and saves edits through PUT /api/licenses. The standard-user viewer is
 * app/(tabs)/settings/licenses.tsx.
 */
export default function LicensesAdminScreen() {
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, getLicenses, saveLicenses } = useLicensesAdmin();

  const canManage = hasAuthority('FUNC_LICENSES_MANAGE');

  const [page, setPage] = useState<Licenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPage(await getLicenses());
    } catch (loadError) {
      setError(loadError as Error);
    } finally {
      setLoading(false);
    }
    // getLicenses is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) {
    return <Redirect href="/settings" />;
  }

  const handleSubmit = async (values: Parameters<typeof saveLicenses>[0]) => {
    try {
      const saved = await saveLicenses(values);
      setPage(saved);
      showAlert(t('common.success'), t('admin.licenses.saved'));
    } catch (saveError) {
      showAlert(t('admin.licenses.saveError'), isBffError(saveError) ? saveError.message : t('common.tryAgain'));
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.licenses.title')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.licenses.title')} />
        <ErrorBanner message={isBffError(error) ? error.message : t('admin.licenses.loadError')} onRetry={load} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.licenses.title')} />
      <LicensesForm initialPage={page} submitting={submitting} onSubmit={handleSubmit} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
