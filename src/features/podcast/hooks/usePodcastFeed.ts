import { useCallback, useEffect, useRef, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toPost } from '@/features/podcast/hooks/toPost';
import {
  firstPageRequest,
  hasMorePosts,
  nextPageRequest,
  refreshRequest,
  type PageRequest,
} from '@/features/podcast/services/feedPagination';
import { toBffError } from '@/shared/api/errors';
import type { Post } from '@/shared/types/posts';

interface FeedState {
  posts: Post[];
  total: number;
  isLoading: boolean;
  error: Error | null;
}

/** 'replace' rebuilds the list from the response; 'append' adds to it. */
type LoadMode = 'replace' | 'append';

/**
 * Replicates rork-standard-app/expo's PostsContext pagination behavior on
 * top of GET /api/categories/{slug}/posts: the first page replaces the list,
 * each further page appends, hasMore = posts.length < total. Changing
 * `categorySlug` resets to the first page and clears the current list
 * (README §35 — never mixes posts from two categories in one list).
 *
 * `refresh` re-reads every page loaded so far in one request rather than
 * dropping back to page 0: the screen refreshes on every regained focus, so a
 * page-0 refresh threw away everything the user had paged in each time they
 * came back from an episode. See services/feedPagination.ts for the offset
 * math that keeps the following `loadMore` contiguous.
 */
export function usePodcastFeed(categorySlug: string | undefined) {
  const [state, setState] = useState<FeedState>({ posts: [], total: 0, isLoading: true, error: null });
  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  const load = useCallback(async (slug: string, request: PageRequest, mode: LoadMode) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: mode === 'replace' ? null : prev.error }));

    try {
      const { data, error, response } = await bffClient.GET('/api/categories/{slug}/posts', {
        params: { path: { slug }, query: { page: request.page, size: request.size } },
      });

      if (error || !data) {
        const bffError = toBffError(error, response.status);
        setState((prev) => (mode === 'replace' ? { posts: [], total: 0, isLoading: false, error: bffError } : { ...prev, isLoading: false, error: bffError }));
        return;
      }

      const newPosts = (data.posts ?? []).map(toPost);
      pageRef.current = request.lastPage;
      setState((prev) => ({
        posts: mode === 'replace' ? newPosts : [...prev.posts, ...newPosts],
        total: data.total ?? 0,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      // A thrown network error (rather than openapi-fetch's {error} field)
      // must still clear isLoading — otherwise this list is stuck on its
      // spinner forever with no way to retry. See useHomeVideos.ts.
      const bffError = err instanceof Error ? err : new Error('Network error');
      setState((prev) => (mode === 'replace' ? { posts: [], total: 0, isLoading: false, error: bffError } : { ...prev, isLoading: false, error: bffError }));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!categorySlug) return;
    pageRef.current = 0;
    setState({ posts: [], total: 0, isLoading: true, error: null });
    load(categorySlug, firstPageRequest(), 'replace');
    // Intentionally re-runs only when the selected category changes —
    // loadMore/refresh below drive everything else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug]);

  const hasMore = hasMorePosts(state.posts.length, state.total);

  const loadMore = useCallback(() => {
    if (categorySlug && !loadingRef.current && hasMorePosts(state.posts.length, state.total)) {
      load(categorySlug, nextPageRequest(pageRef.current), 'append');
    }
  }, [categorySlug, load, state.posts.length, state.total]);

  const refresh = useCallback(() => {
    if (categorySlug) load(categorySlug, refreshRequest(pageRef.current), 'replace');
  }, [categorySlug, load]);

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
