import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { PodcastEpisodeDetail } from '@/features/podcast/components/PodcastEpisodeDetail';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';
import { getEpisodeNumber } from '@/features/podcast/services/episodeMeta';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { Spacing } from '@/shared/constants/theme';

export default function PodcastDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { hasAuthority } = useAuth();
  const { post, loading, error, refetch } = usePodcastPost(slug);
  const { deletePost, submitting } = usePodcastAdmin();

  const canEdit = hasAuthority('FUNC_PODCAST_EDIT_POST');
  const canDelete = hasAuthority('FUNC_PODCAST_DELETE_POST');

  const handleEdit = () => {
    if (!post) return;
    router.push({
      pathname: '/podcast/admin/[id]',
      // The edit screen fetches the full post (blocks included) by slug —
      // see (tabs)/podcast/admin/[id].tsx.
      params: { id: post.id, slug: post.slug },
    });
  };

  const handleDelete = () => {
    if (!post || submitting) return;
    Alert.alert('Delete post', `Delete "${post.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id);
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
    return <ErrorBanner message={isBffError(error) ? error.message : 'Post not found.'} onRetry={refetch} />;
  }

  return (
    <PodcastEpisodeDetail
      post={post}
      episodeNumber={getEpisodeNumber(post)}
      canEdit={canEdit}
      canDelete={canDelete}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Spacing.six,
  },
});
