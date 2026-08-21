import { useCallback, useEffect, useRef, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toVideo } from '@/features/home/hooks/toVideo';
import { shuffleVideos } from '@/features/home/utils/shuffleVideos';
import { toBffError } from '@/shared/api/errors';
import type { Video } from '@/shared/types/video';

interface HomeVideosState {
  sourceVideos: Video[];
  shuffledVideos: Video[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * README_HOME_DASHBOARD.md §20: fetch/loading/error/shuffle/reloadHome for
 * the Home dashboard. `reloadHome` (tab reselect) reshuffles the
 * already-loaded list in place — it deliberately does not refetch, per §11
 * ("randomization... the user explicitly presses/reselects Home" is
 * distinct from "the source list changes"). `refresh` (pull-to-refresh, §12)
 * refetches, then shuffles the new result.
 */
export function useHomeVideos() {
  const [state, setState] = useState<HomeVideosState>({
    sourceVideos: [],
    shuffledVideos: [],
    isLoading: true,
    error: null,
  });
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error, response } = await bffClient.GET('/api/home/videos');

      if (error) {
        setState((prev) => ({ ...prev, isLoading: false, error: toBffError(error, response.status) }));
        return;
      }

      const videos = (data ?? []).map(toVideo);
      setState({ sourceVideos: videos, shuffledVideos: shuffleVideos(videos), isLoading: false, error: null });
    } catch (err) {
      // A thrown network error (rather than openapi-fetch's {error} field)
      // must still clear isLoading — otherwise Home is stuck on its spinner
      // forever with no way to retry.
      setState((prev) => ({ ...prev, isLoading: false, error: err instanceof Error ? err : new Error('Network error') }));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reloadHome = useCallback(() => {
    setState((prev) => ({ ...prev, shuffledVideos: shuffleVideos(prev.sourceVideos) }));
  }, []);

  return {
    videos: state.shuffledVideos,
    isLoading: state.isLoading,
    error: state.error,
    refresh: load,
    reloadHome,
  };
}
