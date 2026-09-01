import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { AboutForm } from '@/features/about/components/AboutForm';
import { useAboutAdmin } from '@/features/about/hooks/useAboutAdmin';
import type { AboutPage } from '@/features/about/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * About Us management, reached from Settings → Administration. Gated by
 * FUNC_ABOUT_US_MANAGE. Loads the current page (draft or published) and saves
 * edits through PUT /api/about-us. See .docs/ABOUT_US_README.md.
 */
export default function AboutUsAdminScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, getAboutPage, saveAboutPage, uploadImage } = useAboutAdmin();

  const canManage = hasAuthority('FUNC_ABOUT_US_MANAGE');

  const [page, setPage] = useState<AboutPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPage(await getAboutPage());
    } catch (loadError) {
      setError(loadError as Error);
    } finally {
      setLoading(false);
    }
    // getAboutPage is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) {
    return <Redirect href="/settings" />;
  }

  const handleSubmit = async (values: Parameters<typeof saveAboutPage>[0]) => {
    try {
      const saved = await saveAboutPage(values);
      setPage(saved);
      showAlert(t('common.success'), t('admin.aboutUs.saved'));
    } catch (saveError) {
      showAlert(t('admin.aboutUs.saveError'), isBffError(saveError) ? saveError.message : t('common.tryAgain'));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.aboutUs.title')} />
      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.primary} />
      ) : error ? (
        <ErrorBanner message={isBffError(error) ? error.message : t('admin.aboutUs.loadError')} onRetry={load} />
      ) : (
        <AboutForm
          initialPage={page}
          submitting={submitting}
          onSubmit={handleSubmit}
          onUploadImage={uploadImage}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { marginTop: Spacing.six },
});
