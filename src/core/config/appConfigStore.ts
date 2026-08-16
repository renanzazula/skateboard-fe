import { bffClient } from '@/core/api/client';

export type AppConfigStatus = 'loading' | 'ready' | 'error';

interface AppConfigState {
  status: AppConfigStatus;
  loginBackgroundUrl: string | null;
  loginBackgroundVersion: number;
  appLogoUrl: string | null;
  appLogoVersion: number;
}

let state: AppConfigState = {
  status: 'loading',
  loginBackgroundUrl: null,
  loginBackgroundVersion: 0,
  appLogoUrl: null,
  appLogoVersion: 0,
};
const listeners = new Set<() => void>();

function setState(next: AppConfigState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/** For React's useSyncExternalStore — see core/config/useAppConfig.ts. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AppConfigState {
  return state;
}

/**
 * Fetches the public app configuration (GET /api/config, anonymous) once at
 * app start. Login background/app logo must be available on the pre-auth
 * (auth) route group, so this runs independently of auth bootstrap — see
 * AppConfigProvider.tsx and core/auth/authStore.ts's own bootstrap().
 */
export async function bootstrap(): Promise<void> {
  try {
    const { data, error } = await bffClient.GET('/api/config');
    if (error || !data) {
      console.error('[appConfigStore] GET /api/config failed', error);
      setState({ ...state, status: 'error' });
      return;
    }
    console.log('[appConfigStore] GET /api/config ok', data);
    setState({
      status: 'ready',
      loginBackgroundUrl: data.loginBackgroundUrl ?? null,
      loginBackgroundVersion: data.loginBackgroundVersion ?? 0,
      appLogoUrl: data.appLogoUrl ?? null,
      appLogoVersion: data.appLogoVersion ?? 0,
    });
  } catch (err) {
    console.error('[appConfigStore] GET /api/config threw', err);
    setState({ ...state, status: 'error' });
  }
}
