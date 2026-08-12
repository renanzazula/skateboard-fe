import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { useAuth } from '@/core/auth';
import { PostForm, type PostFormValues } from '@/features/podcast/components/PostForm';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { isBffError } from '@/shared/api/errors';

// There is no "get post by id" endpoint on the BFF (only by slug), so this
// screen is only reachable from the detail screen's Edit link, which passes
// the post's current fields as route params to prefill the form — see
// (tabs)/podcast/[slug].tsx.
export default function EditPodcastPostScreen() {
  const { id, slug, title, coverUrl, status } = useLocalSearchParams<{
    id: string;
    slug?: string;
    title?: string;
    coverUrl?: string;
    status?: string;
  }>();
  const { hasAuthority } = useAuth();
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

  return (
    <PostForm
      initialValues={{ title, coverUrl, status: status as PostFormValues['status'] }}
      submitLabel="Save changes"
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  );
}
