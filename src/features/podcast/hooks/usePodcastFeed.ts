import { useCallback, useEffect, useRef, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toPost } from '@/features/podcast/hooks/toPost';
import { toBffError } from '@/shared/api/errors';
import type { Post } from '@/shared/types/posts';

const PAGE_SIZE = 10;

interface FeedState {
  posts: Post[];
  total: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Replicates rork-standard-app/expo's PostsContext pagination behavior on
 * top of the existing GET /api/podcast?page=&size= endpoint: page 0
 * replaces the list, page N>0 appends, hasMore = posts.length < total. No
 * Context — same visible behavior (infinite scroll, pull-to-refresh) via a
 * plain hook, matching this app's "start simple" pattern.
 */
export function usePodcastFeed() {
  const [state, setState] = useState<FeedState>({ posts: [], total: 0, isLoading: true, error: null });
  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (page: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: page === 0 ? null : prev.error }));

    const { data, error, response } = await bffClient.GET('/api/podcast', {
      params: { query: { page, size: PAGE_SIZE } },
    });

    if (error) {
      const bffError = toBffError(error, response.status);
      setState((prev) => (page === 0 ? { posts: [], total: 0, isLoading: false, error: bffError } : { ...prev, isLoading: false, error: bffError }));
      loadingRef.current = false;
      return;
    }

    const newPosts = (data.posts ?? []).map(toPost);
    pageRef.current = page;
    setState((prev) => ({
      posts: page === 0 ? newPosts : [...prev.posts, ...newPosts],
      total: data.total ?? 0,
      isLoading: false,
      error: null,
    }));
    loadingRef.current = false;
  }, []);

  useEffect(() => {
    loadPage(0);
    // Fetch page 0 exactly once on mount — loadMore/refresh drive everything after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasMore = state.posts.length < state.total;

  const loadMore = useCallback(() => {
    if (!loadingRef.current && state.posts.length < state.total) {
      loadPage(pageRef.current + 1);
    }
  }, [loadPage, state.posts.length, state.total]);

  const refresh = useCallback(() => loadPage(0), [loadPage]);

  return {
    posts: state.posts,
    total: state.total,
    isLoading: state.isLoading,
    error: state.error,
    hasMore,
    loadMore,
    refresh,
  };
}
