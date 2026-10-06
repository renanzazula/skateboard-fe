import { ScrollView, StyleSheet } from 'react-native';

import { GuestApplicationStatusBadge } from '@/features/guest-application/components/GuestApplicationStatusBadge';
import type { GuestApplication } from '@/features/guest-application/types';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

/** Read-only view of the caller's own application, whatever its status. */
export function GuestApplicationStatusView({ application }: Readonly<{ application: GuestApplication }>) {
  const { t, language } = useTranslation();

  const submittedOn = application.createdAt
    ? new Date(application.createdAt).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView type="surface" style={styles.card}>
        {application.status ? <GuestApplicationStatusBadge status={application.status} /> : null}
        <ThemedText type="subtitle">{t('guestApplication.statusTitle')}</ThemedText>
        {submittedOn ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('guestApplication.statusSubmittedOn', { date: submittedOn })}
          </ThemedText>
        ) : null}
        {application.message ? (
          <ThemedText type="default" style={styles.message}>
            {application.message}
          </ThemedText>
        ) : null}
        {application.socialLinks && application.socialLinks.length > 0 ? (
          <ThemedView style={styles.links}>
            {application.socialLinks.map((link) => (
              <ThemedText key={link} type="small" themeColor="primary">
                {link}
              </ThemedText>
            ))}
          </ThemedView>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: RADII.card,
  },
  message: { marginTop: Spacing.one },
  links: { gap: Spacing.one, marginTop: Spacing.one },
});
