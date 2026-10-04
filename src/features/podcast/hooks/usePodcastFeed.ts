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
 * N>0 appends, hasMore = posts.length < total. Changing `categorySlug` or
 * `search` resets to page 0 and clears the current list (README §35 — never
 * mixes posts from two categories, or two searches, in one list).
 *
 * `search` (title or episode number, matched by podcast-be) is expected to be
 * debounced by the caller. A new category/search is never blocked by a
 * request still in flight for the previous one — only the latest response is
 * applied (requestIdRef), the same latest-wins rule as useFeaturedContentPicker,
 * so a slow reply for "4" can't overwrite the results for "42".
 */
export function usePodcastFeed(categorySlug: string | undefined, search = '') {
  const query = search.trim();
  const [state, setState] = useState<FeedState>({ posts: [], total: 0, isLoading: true, error: null });
  const pageRef = useRef(0);
  const requestIdRef = useRef(0);
  // Identifies the request currently in flight, if any. An identical request
  // (the focus refresh racing the category-change load on mount) is collapsed
  // into it, and loadMore never stacks a second page fetch on top of a load.
  const inFlightRef = useRef<string | null>(null);

  const loadPage = useCallback(async (slug: string, q: string, page: number) => {
    const key = `${slug}\n${q}\n${page}`;
    if (inFlightRef.current === key) return;
    if (page > 0 && inFlightRef.current !== null) return;
    const requestId = ++requestIdRef.current;
    inFlightRef.current = key;
    setState((prev) => ({ ...prev, isLoading: true, error: page === 0 ? null : prev.error }));

    try {
      const { data, error, response } = await bffClient.GET('/api/categories/{slug}/posts', {
        params: { path: { slug }, query: { page, size: PAGE_SIZE, ...(q ? { search: q } : {}) } },
      });

      if (requestId !== requestIdRef.current) return;

      if (error || !data) {
        const bffError = toBffError(error, response.status);
        setState((prev) => (page === 0 ? { posts: [], total: 0, isLoading: false, error: bffError } : { ...prev, isLoading: false, error: bffError }));
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
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      // A thrown network error (rather than openapi-fetch's {error} field)
      // must still clear isLoading — otherwise this list is stuck on its
      // spinner forever with no way to retry. See useHomeVideos.ts.
      const bffError = err instanceof Error ? err : new Error('Network error');
      setState((prev) => (page === 0 ? { posts: [], total: 0, isLoading: false, error: bffError } : { ...prev, isLoading: false, error: bffError }));
    } finally {
      // A superseded request leaves the marker to the one that replaced it.
      if (requestId === requestIdRef.current) inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!categorySlug) return;
    pageRef.current = 0;
    setState({ posts: [], total: 0, isLoading: true, error: null });
    loadPage(categorySlug, query, 0);
    // Intentionally re-runs only when the category or search changes —
    // loadMore/refresh below drive everything else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, query]);

  const hasMore = state.posts.length < state.total;

  const loadMore = useCallback(() => {
    if (categorySlug && state.posts.length < state.total) {
      loadPage(categorySlug, query, pageRef.current + 1);
    }
  }, [categorySlug, query, loadPage, state.posts.length, state.total]);

  const refresh = useCallback(() => {
    if (categorySlug) loadPage(categorySlug, query, 0);
  }, [categorySlug, query, loadPage]);

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
