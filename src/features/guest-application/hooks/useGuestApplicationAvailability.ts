import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';

interface State {
  enabled: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * GET /api/guest-application-settings — feature availability only, no
 * recipient list or template (any authenticated caller may read it). Drives
 * whether Settings → Community's "Be a Podcast Guest" row opens the form or
 * an unavailable state. Same load/refetch shape as
 * features/about/hooks/useAboutPage.ts.
 */
export function useGuestApplicationAvailability() {
  const [state, setState] = useState<State>({ enabled: false, loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error, response } = await bffClient.GET('/api/guest-application-settings');
      if (error || !data) {
        setState({ enabled: false, loading: false, error: toBffError(error, response.status) });
        return;
      }
      setState({ enabled: data.enabled, loading: false, error: null });
    } catch (err) {
      setState({ enabled: false, loading: false, error: err instanceof Error ? err : new Error('Network error') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
