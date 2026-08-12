import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { PostCard } from '@/features/podcast/components/PostCard';
import { usePodcastFeed } from '@/features/podcast/hooks/usePodcastFeed';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, Spacing } from '@/shared/constants/theme';

const PAGE_SIZE = 10;

export default function PodcastListScreen() {
  const { hasAuthority } = useAuth();
  const [page, setPage] = useState(0);
  const { posts, total, loading, error, refetch } = usePodcastFeed(page, PAGE_SIZE);

  // Re-fetch whenever this screen regains focus, e.g. returning here after
  // creating, editing, or deleting a post from the admin screens.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const canCreate = hasAuthority('FUNC_PODCAST_CREATE_POST');
  const canImport = hasAuthority('FUNC_PODCAST_IMPORT_JSON');
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {(canCreate || canImport) && (
          <ThemedView style={styles.adminRow}>
            {canCreate && (
              <Link href="/podcast/admin/new" asChild>
                <Pressable>
                  <ThemedView type="backgroundSelected" style={styles.adminButton}>
                    <ThemedText type="smallBold">New post</ThemedText>
                  </ThemedView>
                </Pressable>
              </Link>
            )}
            {canImport && (
              <Link href="/podcast/admin/import" asChild>
                <Pressable>
                  <ThemedView type="backgroundElement" style={styles.adminButton}>
                    <ThemedText type="smallBold">Import</ThemedText>
                  </ThemedView>
                </Pressable>
              </Link>
            )}
          </ThemedView>
        )}

        {error && (
          <ErrorBanner message={isBffError(error) ? error.message : 'Something went wrong.'} onRetry={refetch} />
        )}

        {loading && posts.length === 0 ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(post) => post.id ?? post.slug ?? post.title ?? ''}
            renderItem={({ item }) => <PostCard post={item} />}
            contentContainerStyle={styles.list}
            refreshing={loading}
            onRefresh={refetch}
            ListEmptyComponent={
              !error ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  No podcast posts yet.
                </ThemedText>
              ) : null
            }
            ListFooterComponent={
              posts.length > 0 ? (
                <ThemedView style={styles.pagination}>
                  <Pressable disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))}>
                    <ThemedText type="link" themeColor={page === 0 ? 'textSecondary' : 'text'}>
                      Previous
                    </ThemedText>
                  </Pressable>
                  <Pressable disabled={!hasNextPage} onPress={() => setPage((p) => p + 1)}>
                    <ThemedText type="link" themeColor={hasNextPage ? 'text' : 'textSecondary'}>
                      Next
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
  adminRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  adminButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  list: {
    paddingVertical: Spacing.two,
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
