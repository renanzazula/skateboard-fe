import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toPost } from '@/features/podcast/hooks/toPost';
import { toBffError } from '@/shared/api/errors';
import type { Post } from '@/shared/types/posts';

interface PostState {
  post: Post | null;
  loading: boolean;
  error: Error | null;
}

export function usePodcastPost(slug: string) {
  const [state, setState] = useState<PostState>({ post: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState({ post: null, loading: true, error: null });
    const { data, error, response } = await bffClient.GET('/api/podcast/{slug}', {
      params: { path: { slug } },
    });
    if (error) {
      setState({ post: null, loading: false, error: toBffError(error, response.status) });
      return;
    }
    setState({ post: toPost(data), loading: false, error: null });
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
