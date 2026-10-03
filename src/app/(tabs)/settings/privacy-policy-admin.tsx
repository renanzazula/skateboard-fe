import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { PrivacyPolicyForm } from '@/features/privacy-policy/admin/components/PrivacyPolicyForm';
import { usePrivacyPolicyAdmin } from '@/features/privacy-policy/hooks/usePrivacyPolicyAdmin';
import type { PrivacyPolicy } from '@/features/privacy-policy/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * Privacy Policy management, reached from Settings → Administration. Gated by
 * FUNC_PRIVACY_POLICY_MANAGE. Loads the current page (draft or published) and
 * saves edits through PUT /api/privacy-policy. The public read screen is
 * app/privacy-policy.tsx — fully anonymous, unlike this one.
 */
export default function PrivacyPolicyAdminScreen() {
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, getPrivacyPolicy, savePrivacyPolicy } = usePrivacyPolicyAdmin();

  const canManage = hasAuthority('FUNC_PRIVACY_POLICY_MANAGE');

  const [page, setPage] = useState<PrivacyPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPage(await getPrivacyPolicy());
    } catch (loadError) {
      setError(loadError as Error);
    } finally {
      setLoading(false);
    }
    // getPrivacyPolicy is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) {
    return <Redirect href="/settings" />;
  }

  const handleSubmit = async (values: Parameters<typeof savePrivacyPolicy>[0]) => {
    try {
      const saved = await savePrivacyPolicy(values);
      setPage(saved);
      showAlert(t('common.success'), t('admin.privacyPolicy.saved'));
    } catch (saveError) {
      showAlert(t('admin.privacyPolicy.saveError'), isBffError(saveError) ? saveError.message : t('common.tryAgain'));
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.privacyPolicy.title')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.privacyPolicy.title')} />
        <ErrorBanner message={isBffError(error) ? error.message : t('admin.privacyPolicy.loadError')} onRetry={load} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.privacyPolicy.title')} />
      <PrivacyPolicyForm initialPage={page} submitting={submitting} onSubmit={handleSubmit} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
