import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { GuestApplicationSettingsForm } from '@/features/guest-application/components/GuestApplicationSettingsForm';
import { useGuestApplicationSettingsAdmin } from '@/features/guest-application/hooks/useGuestApplicationSettingsAdmin';
import type { GuestApplicationSettings } from '@/features/guest-application/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * Settings → Administration → Guest Application Settings. Gated by
 * FUNC_GUEST_APPLICATION_CONFIGURE. The standard-user "Be a Podcast Guest"
 * entry point is app/(tabs)/settings/guest-application.tsx.
 */
export default function GuestApplicationSettingsAdminScreen() {
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, getSettings, saveSettings } = useGuestApplicationSettingsAdmin();

  const canConfigure = hasAuthority('FUNC_GUEST_APPLICATION_CONFIGURE');

  const [settings, setSettings] = useState<GuestApplicationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await getSettings());
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // getSettings is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canConfigure) load();
  }, [canConfigure, load]);

  if (!canConfigure) return <Redirect href="/settings" />;

  const handleSubmit = async (values: Parameters<typeof saveSettings>[0]) => {
    try {
      setSettings(await saveSettings(values));
      showAlert(t('common.success'), t('admin.guestApplicationSettings.saved'));
    } catch (err) {
      showAlert(
        t('admin.guestApplicationSettings.saveError'),
        isBffError(err) ? err.message : t('common.tryAgain')
      );
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.guestApplicationSettings.title')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error || !settings) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.guestApplicationSettings.title')} />
        <ErrorBanner
          message={isBffError(error) ? error.message : t('admin.guestApplicationSettings.loadError')}
          onRetry={load}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.guestApplicationSettings.title')} />
      <GuestApplicationSettingsForm initialSettings={settings} submitting={submitting} onSubmit={handleSubmit} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
