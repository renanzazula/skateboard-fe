import { Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { GuestApplicationForm } from '@/features/guest-application/components/GuestApplicationForm';
import { GuestApplicationStatusView } from '@/features/guest-application/components/GuestApplicationStatusView';
import { useGuestApplicationAvailability } from '@/features/guest-application/hooks/useGuestApplicationAvailability';
import { useMyGuestApplication } from '@/features/guest-application/hooks/useMyGuestApplication';
import { useSubmitGuestApplication } from '@/features/guest-application/hooks/useSubmitGuestApplication';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedView } from '@/shared/components/themed-view';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * Settings → Community → Be a Podcast Guest. Existing applications stay
 * reachable even once new submissions are disabled (spec §6) — the screen
 * shows the status view whenever one exists, regardless of `enabled`, and
 * only falls back to the "not available" empty state when there is neither.
 */
export default function GuestApplicationScreen() {
  const { t } = useTranslation();
  const { email } = useAuth();
  const { profile } = useProfile();
  const { enabled, loading: loadingAvailability } = useGuestApplicationAvailability();
  const { application, loading: loadingApplication, error, refetch } = useMyGuestApplication();
  const { submitting, submit } = useSubmitGuestApplication();

  const loading = loadingAvailability || loadingApplication;

  const handleSubmit = async (input: Parameters<typeof submit>[0]) => {
    try {
      await submit(input);
      await refetch();
    } catch (submitError) {
      showAlert(
        t('guestApplication.submitError'),
        isBffError(submitError) ? submitError.message : t('common.tryAgain')
      );
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('guestApplication.title')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('guestApplication.title')} />
        <ErrorBanner message={isBffError(error) ? error.message : t('guestApplication.loadError')} onRetry={refetch} />
      </ThemedView>
    );
  }

  if (application) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('guestApplication.title')} />
        <GuestApplicationStatusView application={application} />
      </ThemedView>
    );
  }

  if (!enabled) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('guestApplication.title')} />
        <EmptyState
          icon={Users}
          title={t('guestApplication.notAvailableTitle')}
          description={t('guestApplication.notAvailableMessage')}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('guestApplication.title')} />
      <GuestApplicationForm
        initialName={profile?.displayName || profile?.username || ''}
        email={email ?? ''}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
