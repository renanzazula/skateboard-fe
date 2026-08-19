import { useCallback, useEffect, useRef, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toPost } from '@/features/podcast/hooks/toPost';
import { toBffError } from '@/shared/api/errors';
import type { Post } from '@/shared/types/posts';

const PAGE_SIZE = 30;

interface PickerState {
  posts: Post[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Backs the Featured Player admin screen's episode picker: search-as-you-type
 * over GET /api/podcast (README-home-featured-mini-player.md §9). One page of
 * up to PAGE_SIZE results — this feature doesn't need infinite scroll to be
 * useful, unlike the main Podcast tab's usePodcastFeed.ts.
 */
export function useFeaturedContentPicker() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<PickerState>({ posts: [], isLoading: true, error: null });
  const requestIdRef = useRef(0);

  const load = useCallback(async (query: string) => {
    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const { data, error, response } = await bffClient.GET('/api/podcast', {
      params: { query: { page: 0, size: PAGE_SIZE, search: query.trim() || undefined } },
    });

    if (requestId !== requestIdRef.current) return;

    if (error) {
      setState({ posts: [], isLoading: false, error: toBffError(error, response.status) });
      return;
    }
    setState({ posts: (data.posts ?? []).map(toPost), isLoading: false, error: null });
  }, []);

  useEffect(() => {
    load(search);
  }, [search, load]);

  return { search, setSearch, posts: state.posts, isLoading: state.isLoading, error: state.error };
}
