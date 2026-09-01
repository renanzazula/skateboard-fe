import { ActivityIndicator, StyleSheet } from 'react-native';

import { AboutPageView } from '@/features/about/components/AboutPageView';
import { useAboutPage } from '@/features/about/hooks/useAboutPage';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

/**
 * Read-only About Us page for every authenticated user, reached from
 * Settings → About. Content comes from GET /api/about-us — admins manage it at
 * /settings/about-us-admin. See .docs/ABOUT_US_README.md.
 */
export default function AboutUsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { page, loading, error, refetch } = useAboutPage();

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('aboutUs.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.primary} />
      ) : error ? (
        <ErrorBanner message={isBffError(error) ? error.message : t('aboutUs.loadError')} onRetry={refetch} />
      ) : (
        <AboutPageView page={page} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { marginTop: Spacing.six },
});
