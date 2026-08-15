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
 * top of GET /api/categories/{slug}/posts: page 0 replaces the list, page
 * N>0 appends, hasMore = posts.length < total. Changing `categorySlug`
 * resets to page 0 and clears the current list (README §35 — never mixes
 * posts from two categories in one list).
 */
export function usePodcastFeed(categorySlug: string | undefined) {
  const [state, setState] = useState<FeedState>({ posts: [], total: 0, isLoading: true, error: null });
  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (slug: string, page: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: page === 0 ? null : prev.error }));

    const { data, error, response } = await bffClient.GET('/api/categories/{slug}/posts', {
      params: { path: { slug }, query: { page, size: PAGE_SIZE } },
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
    if (!categorySlug) return;
    pageRef.current = 0;
    setState({ posts: [], total: 0, isLoading: true, error: null });
    loadPage(categorySlug, 0);
    // Intentionally re-runs only when the selected category changes —
    // loadMore/refresh below drive everything else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug]);

  const hasMore = state.posts.length < state.total;

  const loadMore = useCallback(() => {
    if (categorySlug && !loadingRef.current && state.posts.length < state.total) {
      loadPage(categorySlug, pageRef.current + 1);
    }
  }, [categorySlug, loadPage, state.posts.length, state.total]);

  const refresh = useCallback(() => {
    if (categorySlug) loadPage(categorySlug, 0);
  }, [categorySlug, loadPage]);

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
