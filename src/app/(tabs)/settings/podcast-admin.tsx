import { Redirect, router } from 'expo-router';
import { ListOrdered, RefreshCw } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { isBffError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * Podcast administration, reached from Settings → Administration. Hosts the
 * actions that used to sit in the Podcast screen header: the YouTube sync
 * trigger and the category management entry point.
 */
export default function PodcastAdminScreen() {
  const { hasAuthority } = useAuth();
  const { t } = useTranslation();
  const { triggerSync, submitting: syncing } = usePodcastAdmin();

  const canSync = hasAuthority('FUNC_PODCAST_IMPORT_JSON');
  const canManageCategories = hasAuthority('FUNC_PODCAST_MANAGE_CATEGORIES');

  if (!canSync && !canManageCategories) {
    return <Redirect href="/settings" />;
  }

  const handleSync = async () => {
    if (syncing) return;
    try {
      const result = await triggerSync();
      showAlert(
        t('common.success'),
        t('podcast.syncSuccess').replace('{created}', String(result.created ?? 0))
      );
    } catch (syncError) {
      showAlert(t('common.error'), isBffError(syncError) ? syncError.message : t('podcast.syncFailed'));
    }
  };

  const rows = [
    ...(canSync
      ? [
          <SettingsRow
            key="sync"
            icon={RefreshCw}
            title={syncing ? t('podcast.syncing') : t('podcast.syncNow')}
            subtitle="Import new episodes and playlists from YouTube"
            onPress={handleSync}
            disabled={syncing}
            trailing={{ type: 'chevron' }}
          />,
        ]
      : []),
    ...(canManageCategories
      ? [
          <SettingsRow
            key="categories"
            icon={ListOrdered}
            title={t('podcast.manageCategories')}
            subtitle="Rename, reorder & pick the default category"
            onPress={() => router.push('/settings/manage-categories')}
            trailing={{ type: 'chevron' }}
          />,
        ]
      : []),
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText type="small" themeColor="textSecondary">
          Administrative actions for the Podcast tab.
        </ThemedText>
        <SettingsSection label="Podcast">{rows}</SettingsSection>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
});
