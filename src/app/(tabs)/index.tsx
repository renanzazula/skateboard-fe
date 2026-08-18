import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Film } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '@/features/home/components/HomeHeader';
import { HomeVideoGalleryItem, TILE_INSET } from '@/features/home/components/HomeVideoGalleryItem';
import { registerHomeReload } from '@/features/home/homeReloadRegistry';
import { useHomeVideos } from '@/features/home/hooks/useHomeVideos';
import { isBffError } from '@/shared/api/errors';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Video } from '@/shared/types/video';

// README_HOME_DASHBOARD.md: random visual wall of video thumbnails — the
// main dashboard. Reselecting the Home tab reshuffles + scrolls to top (see
// features/home/homeReloadRegistry.ts and (tabs)/_layout.tsx's tabPress
// listener). Order is preserved across a Video Details visit and back (§18)
// since reshuffling only happens on first load, explicit reselect, or
// pull-to-refresh — never on refocus.
export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<Video>>(null);
  const { videos, isLoading, error, refresh, reloadHome } = useHomeVideos();
  const [refreshing, setRefreshing] = useState(false);

  const handleReselect = useCallback(() => {
    reloadHome();
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [reloadHome]);

  useEffect(() => registerHomeReload(handleReselect), [handleReselect]);

  const handleVideoPress = useCallback(
    (video: Video) => {
      // Pushes the root-level /video/[slug] route (not /podcast/[slug]) so
      // this stays on the root stack instead of the Podcast tab's own
      // stack — see app/video/[slug].tsx for why.
      router.push({ pathname: '/video/[slug]', params: { slug: video.slug } });
    },
    [router]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: insets.top + Spacing.two }}>
        <HomeHeader />
      </View>

      {error ? (
        <ErrorBanner message={isBffError(error) ? error.message : 'We couldn’t load the videos.'} onRetry={refresh} />
      ) : null}

      {isLoading && videos.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={videos}
          keyExtractor={(item) => item.id}
          masonry
          numColumns={2}
          // Places each tile in the shortest column rather than the next grid
          // cell, so a tall thumbnail doesn't strand empty space beside it.
          optimizeItemArrangement
          renderItem={({ item }) => <HomeVideoGalleryItem video={item} onPress={handleVideoPress} />}
          style={styles.list}
          contentContainerStyle={{
            // Tiles inset themselves by TILE_INSET on every side, so subtract
            // it here to keep the visible outer margin at Spacing.two (8px).
            paddingHorizontal: Spacing.two - TILE_INSET,
            // No safe-area inset here — HomeHeader's wrapper above applies it.
            paddingTop: Spacing.two,
            paddingBottom: BottomTabInset + Spacing.four,
          }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !isLoading && !error ? (
              <EmptyState icon={Film} title="No videos available yet." actionLabel="Refresh" onAction={refresh} />
            ) : null
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
});
