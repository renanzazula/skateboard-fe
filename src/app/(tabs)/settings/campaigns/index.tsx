import { Redirect, router } from 'expo-router';
import { Megaphone } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { CampaignStatusBadge } from '@/features/campaign/admin/components/CampaignStatusBadge';
import { useCampaignList } from '@/features/campaign/admin/hooks/useCampaignList';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

/** Settings → Administration → Startup Campaigns. Gated by FUNC_CAMPAIGN_READ. */
export default function CampaignsListScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { campaigns, loading, error, refetch } = useCampaignList();

  const canRead = hasAuthority('FUNC_CAMPAIGN_READ');
  const canManage = hasAuthority('FUNC_CAMPAIGN_MANAGE');

  if (!canRead) return <Redirect href="/settings" />;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.campaigns.title')} />
        <ActivityIndicator style={styles.loading} color={theme.primary} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.campaigns.title')} />
        <ErrorBanner
          message={isBffError(error) ? error.message : t('admin.campaigns.loadError')}
          onRetry={refetch}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.campaigns.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        {campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title={t('admin.campaigns.empty')} />
        ) : (
          campaigns.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/settings/campaigns/${c.id}`)}
              style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.rowMain}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {c.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {t('admin.campaigns.priority')} {c.priority} ·{' '}
                  {(c.screens ?? []).length} {t('admin.campaigns.screens').toLowerCase()}
                </ThemedText>
              </View>
              <CampaignStatusBadge status={c.status} />
            </Pressable>
          ))
        )}

        {canManage ? (
          <PrimaryButton
            title={t('admin.campaigns.newCampaign')}
            onPress={() => router.push('/settings/campaigns/new')}
          />
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { marginTop: Spacing.six },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.three,
  },
  rowMain: { flex: 1, gap: 2 },
});
