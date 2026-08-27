import { useFocusEffect, useRouter } from 'expo-router';
import { Mic, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { AppHeader } from '@/shared/components/AppHeader';
import { useProfile } from '@/features/account/hooks/useProfile';
import { CategorySelector } from '@/features/podcast/components/CategorySelector';
import { EpisodeCard } from '@/features/podcast/components/EpisodeCard';
import { useCategories } from '@/features/podcast/hooks/useCategories';
import { usePodcastFeed } from '@/features/podcast/hooks/usePodcastFeed';
import { getEpisodeNumber } from '@/features/podcast/services/episodeMeta';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { isBffError } from '@/shared/api/errors';
import { BottomTabInset, MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { Category } from '@/shared/types/category';
import type { Post } from '@/shared/types/posts';

// Ported from rork-standard-app/expo's modules/feed/screens/PodcastScreen.tsx
// (via migrate/podcast/screens/PodcastScreen.tsx), then reworked for
// YouTube-playlist categories per .docs/README_YOUTUBE_PLAYLIST_CATEGORIES_MIGRATION.md.

export default function PodcastListScreen() {
  const colors = useTheme();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();

  const { categories, defaultCategory, isLoading: categoriesLoading, refresh: refreshCategories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  // Only auto-select once, the first time a default becomes available —
  // afterwards the user's own tap (or a refresh) owns selectedCategory.
  useEffect(() => {
    if (!selectedCategory && defaultCategory) setSelectedCategory(defaultCategory);
  }, [defaultCategory, selectedCategory]);

  const { posts, total, isLoading: postsLoading, error, hasMore, loadMore, refresh: refreshPosts } =
    usePodcastFeed(selectedCategory?.slug);

  // This screen stays mounted while the user is on a detail/admin screen, so
  // deletes/edits/creates (and category renames/reorders) made there would
  // otherwise keep showing stale data here. Refetch on every regained focus;
  // usePodcastFeed's in-flight guard collapses this with the category-change
  // load on mount.
  useFocusEffect(
    useCallback(() => {
      refreshCategories();
      refreshPosts();
    }, [refreshCategories, refreshPosts])
  );

  const canCreate = hasAuthority('FUNC_PODCAST_CREATE_POST');

  const [refreshing, setRefreshing] = useState(false);

  const handleEndReached = useCallback(() => {
    if (hasMore) loadMore();
  }, [hasMore, loadMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshCategories(), refreshPosts()]);
    setRefreshing(false);
  }, [refreshCategories, refreshPosts]);

  const handlePostPress = (post: Post) => {
    router.push(`/podcast/${post.slug}`);
  };

  const handleCreatePress = () => {
    router.push('/podcast/admin/new');
  };

  const handleSelectCategory = (category: Category) => {
    if (category.slug !== selectedCategory?.slug) setSelectedCategory(category);
  };

  // Title and episode count live in the AppHeader above the list now, so
  // this is just the category rail.
  const ListHeader = () => (
    <View style={styles.screenHeader}>
      <CategorySelector
        categories={categories}
        selectedSlug={selectedCategory?.slug}
        onSelect={handleSelectCategory}
      />
    </View>
  );

  const ListEmpty = () => (
    <EmptyState
      icon={Mic}
      title={t('podcast.noVideosInCategory')}
      actionLabel={canCreate ? t('podcast.writeFirstPost') : undefined}
      onAction={canCreate ? handleCreatePress : undefined}
    />
  );

  const ListFooter = () => {
    if (postsLoading) return <ActivityIndicator style={styles.footer} color={colors.primary} />;
    if (total === 0) return null;
    return (
      <View>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {hasMore
            ? t('podcast.showingPosts', { current: posts.length, total })
            : t('podcast.allPostsLoaded', { total })}
        </Text>
        {hasMore ? (
          <Pressable
            style={[styles.loadMoreButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={loadMore}>
            <Text style={[styles.loadMoreText, { color: colors.textPrimary }]}>{t('podcast.loadMore')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    // No paddingBottom here: it would shrink the list's viewport rather than
    // add scrollable room at its end, leaving a strip of background the list
    // can never reach — a second, empty bar above the tab bar. The inset
    // belongs on listContent below, the way Home applies it.
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Podcast" subtitle={profile?.username ? `@${profile.username}` : undefined} />

      {error ? (
        <ErrorBanner message={isBffError(error) ? error.message : t('podcast.couldNotLoadVideos')} onRetry={refreshPosts} />
      ) : null}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          // Prefer the show's own numbering from the title; fall back to the
          // row's position in the feed when a title carries no number.
          const episodeNumber = getEpisodeNumber(item) ?? total - index;
          return <EpisodeCard post={item} episodeNumber={episodeNumber} onPress={() => handlePostPress(item)} />;
        }}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={!postsLoading && !categoriesLoading && !error ? <ListEmpty /> : null}
        ListFooterComponent={<ListFooter />}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {canCreate ? (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleCreatePress}
          accessibilityLabel="Create new episode">
          <Plus size={28} color={colors.onPrimary} />
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
    // No safe-area inset — AppHeader applies it above the list.
    paddingTop: 4,
    // Matches Home. Scrollable padding, so the last card clears the tab bar
    // without stranding dead space when the list is short.
    paddingBottom: BottomTabInset + Spacing.four,
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  screenHeader: {
    marginBottom: 18,
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
    // Measured from the screen bottom now that the container no longer insets
    // itself, which keeps the button where it already sat relative to the tab
    // bar instead of dropping behind it.
    bottom: BottomTabInset + Spacing.three,
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
