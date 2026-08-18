import { useCallback, useSyncExternalStore } from 'react';

import * as authStore from '@/core/auth/authStore';

/**
 * Reads the module-level auth store (core/auth/authStore.ts) reactively.
 * The store lives outside React so core/api/client.ts can read/refresh the
 * access token without importing anything React-specific.
 */
export function useAuth() {
  const state = useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState);

  const hasAuthority = useCallback(
    (authority: string) => state.authorities.includes(authority),
    [state.authorities]
  );

  return {
    status: state.status,
    authorities: state.authorities,
    email: state.email,
    hasAuthority,
    login: authStore.login,
    loginWithPassword: authStore.loginWithPassword,
    logout: authStore.logout,
  };
}
