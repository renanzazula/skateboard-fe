import { useRouter } from 'expo-router';
import { Film } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VideoThumbnailCard } from '@/features/home/components/VideoThumbnailCard';
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
  const listRef = useRef<FlatList<Video>>(null);
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
      router.push(`/podcast/${video.slug}`);
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
      {error ? (
        <ErrorBanner message={isBffError(error) ? error.message : 'We couldn’t load the videos.'} onRetry={refresh} />
      ) : null}

      {isLoading && videos.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item, index }) => (
            <VideoThumbnailCard video={item} index={index} onPress={handleVideoPress} />
          )}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !isLoading && !error ? (
              <EmptyState icon={Film} title="No videos available yet." actionLabel="Refresh" onAction={refresh} />
            ) : null
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
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
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  row: {
    gap: Spacing.two,
  },
});
