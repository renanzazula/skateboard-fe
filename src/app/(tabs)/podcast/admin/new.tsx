import { Redirect, router } from 'expo-router';
import { Alert } from 'react-native';

import { useAuth } from '@/core/auth';
import { PostForm, type PostFormValues } from '@/features/podcast/components/PostForm';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { isBffError } from '@/shared/api/errors';

export default function NewPodcastPostScreen() {
  const { hasAuthority } = useAuth();
  const { createPost, submitting } = usePodcastAdmin();

  if (!hasAuthority('FUNC_PODCAST_CREATE_POST')) {
    return <Redirect href="/podcast" />;
  }

  const handleSubmit = async (values: PostFormValues) => {
    try {
      const created = await createPost({ ...values });
      router.replace(`/podcast/${created.slug}`);
    } catch (submitError) {
      Alert.alert('Could not create post', isBffError(submitError) ? submitError.message : 'Try again.');
    }
  };

  return <PostForm submitLabel="Create post" submitting={submitting} onSubmit={handleSubmit} />;
}
