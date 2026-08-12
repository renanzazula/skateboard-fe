import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

export default function PodcastDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { hasAuthority } = useAuth();
  const { post, loading, error, refetch } = usePodcastPost(slug);
  const { deletePost, submitting } = usePodcastAdmin();

  const canEdit = hasAuthority('FUNC_PODCAST_EDIT_POST');
  const canDelete = hasAuthority('FUNC_PODCAST_DELETE_POST');

  const handleDelete = () => {
    if (!post?.id) return;
    Alert.alert('Delete post', `Delete "${post.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id!);
            router.back();
          } catch (deleteError) {
            Alert.alert('Could not delete post', isBffError(deleteError) ? deleteError.message : 'Try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (error || !post) {
    return (
      <ErrorBanner
        message={isBffError(error) ? error.message : 'Post not found.'}
        onRetry={refetch}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {post.coverUrl && <Image source={{ uri: post.coverUrl }} style={styles.cover} />}
      <ThemedText type="title" style={styles.title}>
        {post.title}
      </ThemedText>
      {post.status !== 'published' && (
        <ThemedText type="small" themeColor="textSecondary">
          {post.status}
          {post.publishAt ? ` · ${new Date(post.publishAt).toLocaleString()}` : ''}
        </ThemedText>
      )}

      {(canEdit || canDelete) && (
        <ThemedView style={styles.adminRow}>
          {canEdit && (
            <Link
              href={{
                pathname: '/podcast/admin/[id]',
                params: {
                  id: post.id ?? '',
                  slug: post.slug ?? '',
                  title: post.title ?? '',
                  coverUrl: post.coverUrl ?? '',
                  status: post.status ?? 'published',
                },
              }}
              asChild>
              <Pressable>
                <ThemedView type="backgroundElement" style={styles.adminButton}>
                  <ThemedText type="smallBold">Edit</ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          )}
          {canDelete && (
            <Pressable disabled={submitting} onPress={handleDelete}>
              <ThemedView type="backgroundElement" style={styles.adminButton}>
                <ThemedText type="smallBold">Delete</ThemedText>
              </ThemedView>
            </Pressable>
          )}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Spacing.six,
  },
  container: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
  },
  adminRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  adminButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
