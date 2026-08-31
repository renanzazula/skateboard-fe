import { ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/core/auth';
import { PostForm, type PostFormValues } from '@/features/podcast/components/PostForm';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

// There is no "get post by id" endpoint on the BFF (only by slug), so this
// screen fetches the full post — including blocks/socialMediaLinks, needed
// to prefill the block editor — via slug, which the detail screen's Edit
// link passes alongside id. See (tabs)/podcast/[slug].tsx.
export default function EditPodcastPostScreen() {
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();
  const { hasAuthority } = useAuth();
  const { t } = useTranslation();
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
      showAlert(t('feed.saveChangesError'), isBffError(submitError) ? submitError.message : t('common.tryAgain'));
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (error || !post) {
    return <ErrorBanner message={isBffError(error) ? error.message : t('podcast.postNotFound')} onRetry={refetch} />;
  }

  return (
    <PostForm
      initialValues={{
        title: post.title,
        coverUrl: post.coverUrl,
        status: post.status,
        // A legacy manually-authored post can have no publish date; the form
        // then defaults to now and the admin sets the real one before saving.
        publishAt: post.publishAt ?? undefined,
        blocks: post.blocks,
        socialMediaLinks: post.socialMediaLinks,
      }}
      syncedDescription={post.description}
      submitLabel={t('feed.saveChanges')}
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
