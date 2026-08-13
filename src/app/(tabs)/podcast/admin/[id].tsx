import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/core/auth';
import { PostForm, type PostFormValues } from '@/features/podcast/components/PostForm';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { Spacing } from '@/shared/constants/theme';

// There is no "get post by id" endpoint on the BFF (only by slug), so this
// screen fetches the full post — including blocks/socialMediaLinks, needed
// to prefill the block editor — via slug, which the detail screen's Edit
// link passes alongside id. See (tabs)/podcast/[slug].tsx.
export default function EditPodcastPostScreen() {
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();
  const { hasAuthority } = useAuth();
  const { post, loading, error, refetch } = usePodcastPost(slug);
  const { updatePost, submitting } = usePodcastAdmin();

  if (!hasAuthority('FUNC_PODCAST_EDIT_POST')) {
    return <Redirect href="/podcast" />;
  }

  const handleSubmit = async (values: PostFormValues) => {
    try {
      const updated = await updatePost(id, values);
      router.replace(`/podcast/${updated.slug ?? slug}`);
    } catch (submitError) {
      Alert.alert('Could not save changes', isBffError(submitError) ? submitError.message : 'Try again.');
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (error || !post) {
    return <ErrorBanner message={isBffError(error) ? error.message : 'Post not found.'} onRetry={refetch} />;
  }

  return (
    <PostForm
      initialValues={{
        title: post.title,
        coverUrl: post.coverUrl,
        status: post.status,
        blocks: post.blocks,
        socialMediaLinks: post.socialMediaLinks,
      }}
      submitLabel="Save changes"
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Spacing.six,
  },
});
