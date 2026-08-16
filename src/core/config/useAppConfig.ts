import { useSyncExternalStore } from 'react';

import * as appConfigStore from '@/core/config/appConfigStore';

/**
 * Reads the module-level app-config store (core/config/appConfigStore.ts)
 * reactively — same useSyncExternalStore shape as core/auth/useAuth.ts, so
 * pre-auth screens can render the fetched login background/app logo without
 * waiting on anything auth-specific.
 */
export function useAppConfig() {
  const state = useSyncExternalStore(appConfigStore.subscribe, appConfigStore.getState, appConfigStore.getState);
  return state;
}
