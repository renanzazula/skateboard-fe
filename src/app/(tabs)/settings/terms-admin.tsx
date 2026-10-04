import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { TermsForm } from '@/features/terms/admin/components/TermsForm';
import { useTermsAdmin } from '@/features/terms/hooks/useTermsAdmin';
import type { Terms } from '@/features/terms/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * Terms & Conditions management, reached from Settings → Administration.
 * Gated by FUNC_TERMS_MANAGE. Loads the current page (draft or published)
 * and saves edits through PUT /api/terms. The standard-user viewer is
 * app/(tabs)/settings/terms.tsx.
 */
export default function TermsAdminScreen() {
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, getTerms, saveTerms } = useTermsAdmin();

  const canManage = hasAuthority('FUNC_TERMS_MANAGE');

  const [page, setPage] = useState<Terms | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPage(await getTerms());
    } catch (loadError) {
      setError(loadError as Error);
    } finally {
      setLoading(false);
    }
    // getTerms is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) {
    return <Redirect href="/settings" />;
  }

  const handleSubmit = async (values: Parameters<typeof saveTerms>[0]) => {
    try {
      const saved = await saveTerms(values);
      setPage(saved);
      showAlert(t('common.success'), t('admin.terms.saved'));
    } catch (saveError) {
      showAlert(t('admin.terms.saveError'), isBffError(saveError) ? saveError.message : t('common.tryAgain'));
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.terms.title')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.terms.title')} />
        <ErrorBanner message={isBffError(error) ? error.message : t('admin.terms.loadError')} onRetry={load} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.terms.title')} />
      <TermsForm initialPage={page} submitting={submitting} onSubmit={handleSubmit} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
