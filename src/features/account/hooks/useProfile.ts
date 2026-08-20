import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type UserProfile = components['schemas']['UserResponse'];

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
}

/** GET /api/me on mount + PATCH /api/me — same load/error shape as usePodcastFeed. */
export function useProfile() {
  const [state, setState] = useState<ProfileState>({ profile: null, isLoading: true, error: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, error, response } = await bffClient.GET('/api/me');
      if (error) {
        setState({ profile: null, isLoading: false, error: toBffError(error, response.status) });
        return;
      }
      setState({ profile: data, isLoading: false, error: null });
    } catch (err) {
      // bffClient.GET only shapes HTTP-level (4xx/5xx) failures into `error`
      // — a request that never got a response (network down, CORS, BFF
      // unreachable) throws instead, which would otherwise leave isLoading
      // stuck true forever (ProfileCard's avatar renders blank while loading).
      setState({ profile: null, isLoading: false, error: err instanceof Error ? err : new Error('Could not load profile.') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDisplayName = useCallback(async (displayName: string): Promise<UserProfile> => {
    const { data, error, response } = await bffClient.PATCH('/api/me', { body: { displayName } });
    if (error) throw toBffError(error, response.status);
    setState((prev) => ({ ...prev, profile: data }));
    return data;
  }, []);

  return {
    profile: state.profile,
    isLoading: state.isLoading,
    error: state.error,
    refresh: load,
    updateDisplayName,
  };
}
