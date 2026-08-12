import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type PostSummary = components['schemas']['PostResponse'];

const PAGE_SIZE = 10;

interface FeedState {
  posts: PostSummary[];
  total: number;
  page: number;
  size: number;
  loading: boolean;
  error: Error | null;
}

/** Plain fetch-in-a-hook, no query-cache library — matches the README's "start simple" guidance. */
export function usePodcastFeed(page = 0, size = PAGE_SIZE) {
  const [state, setState] = useState<FeedState>({
    posts: [],
    total: 0,
    page,
    size,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { data, error, response } = await bffClient.GET('/api/podcast', {
      params: { query: { page, size } },
    });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: toBffError(error, response.status) }));
      return;
    }
    setState({
      posts: data.posts ?? [],
      total: data.total ?? 0,
      page: data.page ?? page,
      size: data.size ?? size,
      loading: false,
      error: null,
    });
  }, [page, size]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
