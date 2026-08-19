import { useCallback, useEffect, useRef, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toPost } from '@/features/podcast/hooks/toPost';
import { toBffError } from '@/shared/api/errors';
import type { Post } from '@/shared/types/posts';

const PAGE_SIZE = 20;

interface PickerState {
  posts: Post[];
  total: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Backs the Featured Player admin screen's episode picker: search-as-you-type
 * plus "load more" pagination over GET /api/podcast (README-home-featured-mini-player.md §9).
 * A new search is never blocked by an in-flight one (fast typing must not
 * drop a keystroke) — only the latest response is applied, via requestIdRef.
 * loadMore() is separately guarded against firing a duplicate concurrent page
 * fetch for the same search term.
 */
export function useFeaturedContentPicker() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<PickerState>({ posts: [], total: 0, isLoading: true, error: null });
  const pageRef = useRef(0);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadPage = useCallback(async (query: string, page: number) => {
    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, isLoading: true, error: page === 0 ? null : prev.error }));

    const { data, error, response } = await bffClient.GET('/api/podcast', {
      params: { query: { page, size: PAGE_SIZE, search: query.trim() || undefined } },
    });

    if (requestId !== requestIdRef.current) return;

    if (error) {
      const bffError = toBffError(error, response.status);
      setState((prev) =>
        page === 0 ? { posts: [], total: 0, isLoading: false, error: bffError } : { ...prev, isLoading: false, error: bffError }
      );
      loadingMoreRef.current = false;
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
    loadingMoreRef.current = false;
  }, []);

  useEffect(() => {
    pageRef.current = 0;
    // A fresh search invalidates any "load more" in flight for the previous
    // term — its response will be ignored anyway (requestId mismatch), but
    // this unblocks loadMore for the new term instead of leaving it stuck.
    loadingMoreRef.current = false;
    loadPage(search, 0);
    // Intentionally re-runs only when `search` changes — loadPage is stable
    // (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasMore = state.posts.length < state.total;

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    loadPage(search, pageRef.current + 1);
  }, [search, loadPage, hasMore]);

  return {
    search,
    setSearch,
    posts: state.posts,
    total: state.total,
    isLoading: state.isLoading,
    error: state.error,
    hasMore,
    loadMore,
  };
}
