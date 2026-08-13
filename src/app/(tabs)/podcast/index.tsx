import { useRouter } from 'expo-router';
import { Mic, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { EpisodeCard } from '@/features/podcast/components/EpisodeCard';
import { usePodcastFeed } from '@/features/podcast/hooks/usePodcastFeed';
import { getEpisodeNumber } from '@/features/podcast/services/episodeMeta';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { isBffError } from '@/shared/api/errors';
import { BottomTabInset, DisplayFontFamily, MAX_CONTENT_WIDTH, RADII } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { Post } from '@/shared/types/posts';

// Ported from rork-standard-app/expo's modules/feed/screens/PodcastScreen.tsx
// (via migrate/podcast/screens/PodcastScreen.tsx).

export default function PodcastListScreen() {
  const colors = useTheme();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { posts, total, isLoading, error, hasMore, loadMore, refresh } = usePodcastFeed();

  const canCreate = hasAuthority('FUNC_PODCAST_CREATE_POST');
  const canImport = hasAuthority('FUNC_PODCAST_IMPORT_JSON');

  const [refreshing, setRefreshing] = useState(false);

  const handleEndReached = useCallback(() => {
    if (hasMore) loadMore();
  }, [hasMore, loadMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handlePostPress = (post: Post) => {
    router.push(`/podcast/${post.slug}`);
  };

  const handleCreatePress = () => {
    router.push('/podcast/admin/new');
  };

  const ListHeader = () => (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderTop}>
        <View style={styles.screenHeaderTitles}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Podcast</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textDim }]}>
            {t('podcast.episodeCount').replace('{count}', String(total))}
          </Text>
        </View>
        {canImport ? (
          <Pressable onPress={() => router.push('/podcast/admin/import')} hitSlop={8}>
            <Text style={[styles.importLink, { color: colors.accent }]}>Import</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
        <Mic size={40} color={colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('podcast.noPostsYet')}</Text>
      {canCreate ? (
        <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={handleCreatePress}>
          <Text style={[styles.emptyButtonText, { color: colors.onAccent }]}>{t('podcast.writeFirstPost')}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const ListFooter = () => {
    if (isLoading) return <ActivityIndicator style={styles.footer} color={colors.accent} />;
    if (total === 0) return null;
    return (
      <View>
        <Text style={[styles.footerText, { color: colors.textDim }]}>
          {hasMore
            ? t('podcast.showingPosts').replace('{current}', String(posts.length)).replace('{total}', String(total))
            : t('podcast.allPostsLoaded').replace('{total}', String(total))}
        </Text>
        {hasMore ? (
          <Pressable
            style={[styles.loadMoreButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={loadMore}>
            <Text style={[styles.loadMoreText, { color: colors.text }]}>{t('podcast.loadMore')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: BottomTabInset }]}>
      {error ? (
        <ErrorBanner message={isBffError(error) ? error.message : 'Something went wrong.'} onRetry={refresh} />
      ) : null}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const episodeNumber = getEpisodeNumber(item) ?? total - index;
          return <EpisodeCard post={item} episodeNumber={episodeNumber} onPress={() => handlePostPress(item)} />;
        }}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 16 }]}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={!isLoading && !error ? <ListEmpty /> : null}
        ListFooterComponent={<ListFooter />}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {canCreate ? (
        <Pressable style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={handleCreatePress}>
          <Plus size={28} color={colors.onAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  screenHeader: {
    marginBottom: 18,
  },
  screenHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  screenHeaderTitles: {
    flex: 1,
  },
  importLink: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: DisplayFontFamily,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: DisplayFontFamily,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADII.control,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
