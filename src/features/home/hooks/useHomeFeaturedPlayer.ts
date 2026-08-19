import { useCallback, useEffect, useRef, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type FeaturedPlayerContent = components['schemas']['HomeFeaturedPlayerResponse'];

interface FeaturedPlayerState {
  content: FeaturedPlayerContent | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * README-home-featured-mini-player.md §15: fetches the Home dashboard's
 * effective Featured Player. A 204 (or any load error) means "don't show a
 * player" — mirrors useHomeVideos.ts's shape, but failures here must not
 * surface an ErrorBanner on Home (§21: the rest of Home stays usable
 * regardless of this feature's state), so callers should ignore `error`
 * beyond optionally logging it.
 */
export function useHomeFeaturedPlayer() {
  const [state, setState] = useState<FeaturedPlayerState>({
    content: null,
    isLoading: true,
    error: null,
  });
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const { data, error, response } = await bffClient.GET('/api/home/featured-player');

    if (error) {
      setState({ content: null, isLoading: false, error: toBffError(error, response.status) });
      loadingRef.current = false;
      return;
    }

    setState({ content: data ?? null, isLoading: false, error: null });
    loadingRef.current = false;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    content: state.content,
    isLoading: state.isLoading,
    error: state.error,
    refresh: load,
  };
}
