import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type UserProfile = components['schemas']['UserResponse'];

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Module-level store (same pattern as core/auth/authStore.ts), not
 * per-component state. Every screen that calls useProfile() — ProfileCard,
 * HomeHeader, settings/account.tsx, etc. — used to get its own independent
 * fetch of /api/me with no way to learn about a change made elsewhere. That
 * meant e.g. uploading a profile picture in Settings updated ProfileCard's
 * own copy but never reached HomeHeader's separate instance, which kept
 * showing the stale (or initials-fallback) state until the app restarted.
 * Sharing state here means any refresh()/setProfile() call updates every
 * mounted consumer at once.
 */
let state: ProfileState = { profile: null, isLoading: true, error: null };
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let hasLoadedOnce = false;

function setState(next: ProfileState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState(): ProfileState {
  return state;
}

async function load(): Promise<void> {
  setState({ ...state, isLoading: true, error: null });
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
}

/** Coalesces concurrent callers (several screens mounting at once) into a single request. */
function refresh(): Promise<void> {
  if (!loadPromise) {
    loadPromise = load().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

/** Applies an already-fetched profile (e.g. a mutation's own response) to every consumer without a round trip. */
export function setProfile(profile: UserProfile): void {
  setState({ profile, isLoading: false, error: null });
}

/** GET /api/me on first use across the whole app, shared by every consumer; PATCH /api/me updates it in place. */
export function useProfile() {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    // Only the very first consumer to mount triggers the initial fetch —
    // everyone after that just reads the shared state. (Does not re-fire on
    // a different user signing in on the same device without an app
    // restart; not a flow this app currently supports without a reload.)
    if (!hasLoadedOnce) {
      hasLoadedOnce = true;
      refresh();
    }
  }, []);

  const updateDisplayName = useCallback(async (displayName: string): Promise<UserProfile> => {
    const { data, error, response } = await bffClient.PATCH('/api/me', { body: { displayName } });
    if (error) throw toBffError(error, response.status);
    setProfile(data);
    return data;
  }, []);

  return {
    profile: snapshot.profile,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    refresh,
    updateDisplayName,
  };
}
