import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import type { GuestApplication } from '@/features/guest-application/types';

interface State {
  application: GuestApplication | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Reads the authenticated user's active or most recent application
 * (GET /api/guest-applications/me). A `404` — never applied — resolves to
 * `application: null` with no error, same convention
 * features/about/hooks/useAboutPage.ts uses for its `204`.
 */
export function useMyGuestApplication() {
  const [state, setState] = useState<State>({ application: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error, response } = await bffClient.GET('/api/guest-applications/me');
      if (response.status === 404) {
        setState({ application: null, loading: false, error: null });
        return;
      }
      if (error || !data) {
        setState({ application: null, loading: false, error: toBffError(error, response.status) });
        return;
      }
      setState({ application: data, loading: false, error: null });
    } catch (err) {
      setState({ application: null, loading: false, error: err instanceof Error ? err : new Error('Network error') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
