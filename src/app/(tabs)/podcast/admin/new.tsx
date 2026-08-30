import { Redirect, router } from 'expo-router';

import { useAuth } from '@/core/auth';
import { PostForm, type PostFormValues } from '@/features/podcast/components/PostForm';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { isBffError } from '@/shared/api/errors';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

export default function NewPodcastPostScreen() {
  const { hasAuthority } = useAuth();
  const { createPost, submitting } = usePodcastAdmin();
  const { t } = useTranslation();

  if (!hasAuthority('FUNC_PODCAST_CREATE_POST')) {
    return <Redirect href="/podcast" />;
  }

  const handleSubmit = async (values: PostFormValues) => {
    try {
      const created = await createPost({ ...values });
      router.replace(`/podcast/${created.slug}`);
    } catch (submitError) {
      showAlert(t('feed.createPostError'), isBffError(submitError) ? submitError.message : t('common.tryAgain'));
    }
  };

  return <PostForm submitLabel={t('feed.createPost')} submitting={submitting} onSubmit={handleSubmit} />;
}
