import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { PodcastEpisodeDetail } from '@/features/podcast/components/PodcastEpisodeDetail';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';
import { getEpisodeNumber } from '@/features/podcast/services/episodeMeta';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/**
 * Episode/video detail screen body, shared by the Podcast tab's own
 * `[slug]` route and the root-level `/video/[slug]` route Home links to.
 * Each caller mounts this on its own stack, so a plain `router.back()`
 * always pops back to wherever the caller pushed from — see
 * .docs note in app/video/[slug].tsx for why Home needs its own route
 * instead of pushing into the Podcast tab's stack.
 */
export function PodcastPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { post, loading, error, refetch } = usePodcastPost(slug);
  const { deletePost, submitting } = usePodcastAdmin();

  const canEdit = hasAuthority('FUNC_PODCAST_EDIT_POST');
  const canDelete = hasAuthority('FUNC_PODCAST_DELETE_POST');

  // router.back() is a silent no-op when this screen is the *first* entry on
  // the stack, which happens whenever the app opens straight onto it: a cold
  // start from a deep link (skateboardfe://video/…) or a push notification,
  // and on web every time someone opens or refreshes /video/<slug> directly.
  // Without this guard the back button simply does nothing in those cases.
  // Home is the fallback because that's where the video routes are reached
  // from, and it's a valid destination for the podcast route too.
  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

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
    // showAlert, not Alert.alert — the latter is a silent no-op on web, which
    // made this button appear dead in the browser build.
    showAlert(t('podcast.deletePost'), t('podcast.deletePostConfirm', { title: post.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id);
            goBack();
          } catch (deleteError) {
            showAlert(t('podcast.deletePostError'), isBffError(deleteError) ? deleteError.message : t('common.tryAgain'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (error || !post) {
    return <ErrorBanner message={isBffError(error) ? error.message : t('podcast.postNotFound')} onRetry={refetch} />;
  }

  return (
    <PodcastEpisodeDetail
      post={post}
      episodeNumber={getEpisodeNumber(post)}
      canEdit={canEdit}
      canDelete={canDelete}
      onBack={goBack}
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
