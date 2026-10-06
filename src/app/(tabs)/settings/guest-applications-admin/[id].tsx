import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { GuestApplicationStatusBadge } from '@/features/guest-application/components/GuestApplicationStatusBadge';
import { useGuestApplicationsAdmin } from '@/features/guest-application/hooks/useGuestApplicationsAdmin';
import type { GuestApplication, GuestApplicationStatus } from '@/features/guest-application/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { SecondaryButton } from '@/shared/components/SecondaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

const TRANSITIONS: GuestApplicationStatus[] = ['CONTACTED', 'ACCEPTED', 'DECLINED'];

/** Settings → Administration → Guest Applications → detail. Gated by FUNC_GUEST_APPLICATION_MANAGE. */
export default function GuestApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, getApplication, updateStatus } = useGuestApplicationsAdmin();

  const canManage = hasAuthority('FUNC_GUEST_APPLICATION_MANAGE');

  const [application, setApplication] = useState<GuestApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setApplication(await getApplication(id));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // getApplication is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) return <Redirect href="/settings" />;

  const handleTransition = async (status: GuestApplicationStatus) => {
    if (!id) return;
    try {
      setApplication(await updateStatus(id, status));
    } catch (err) {
      showAlert(
        t('admin.guestApplications.updateError'),
        isBffError(err) ? err.message : t('common.tryAgain')
      );
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.guestApplications.detailTitle')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error || !application) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.guestApplications.detailTitle')} />
        <ErrorBanner
          message={isBffError(error) ? error.message : t('admin.guestApplications.loadError')}
          onRetry={load}
        />
      </ThemedView>
    );
  }

  const submittedOn = application.createdAt
    ? new Date(application.createdAt).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.guestApplications.detailTitle')} />
      <ScrollView contentContainerStyle={styles.content}>
        {application.status ? <GuestApplicationStatusBadge status={application.status} /> : null}

        <ThemedText type="smallBold" style={styles.name}>
          {application.name}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          {application.email}
        </ThemedText>
        {submittedOn ? (
          <ThemedText type="small" themeColor="textMuted">
            {t('admin.guestApplications.submittedOn', { date: submittedOn })}
          </ThemedText>
        ) : null}

        {application.message ? (
          <ThemedView type="surface" style={styles.messageCard}>
            <ThemedText type="default">{application.message}</ThemedText>
          </ThemedView>
        ) : null}

        {application.socialLinks && application.socialLinks.length > 0 ? (
          <View style={styles.links}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.guestApplications.socialLinksLabel')}
            </ThemedText>
            {application.socialLinks.map((link) => (
              <ThemedText key={link} type="small" themeColor="primary">
                {link}
              </ThemedText>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          {TRANSITIONS.filter((status) => status !== application.status).map((status) => (
            <SecondaryButton
              key={status}
              title={t(`admin.guestApplications.markAs_${status}` as 'admin.guestApplications.markAs_CONTACTED')}
              onPress={() => handleTransition(status)}
              disabled={submitting}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
  name: { fontSize: 20, marginTop: Spacing.one },
  messageCard: {
    padding: Spacing.three,
    borderRadius: RADII.card,
    marginTop: Spacing.two,
  },
  links: { gap: Spacing.one, marginTop: Spacing.two },
  actions: { gap: Spacing.two, marginTop: Spacing.three },
});
