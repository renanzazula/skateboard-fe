import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import { toPrivacyPolicy, type PrivacyPolicy } from '@/features/privacy-policy/types';

interface PrivacyPolicyState {
  page: PrivacyPolicy | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Reads the published Privacy Policy page (GET /api/privacy-policy) —
 * fully anonymous, no bearer token sent or required (see core/api/client.ts's
 * authMiddleware: it simply omits Authorization when signed out). A `204` —
 * nothing published yet — resolves to `page: null` with no error, same as
 * features/about/hooks/useAboutPage.ts.
 */
export function usePrivacyPolicy() {
  const [state, setState] = useState<PrivacyPolicyState>({ page: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState({ page: null, loading: true, error: null });
    try {
      const { data, error, response } = await bffClient.GET('/api/privacy-policy');
      if (response.status === 204) {
        setState({ page: null, loading: false, error: null });
        return;
      }
      if (error || !data) {
        setState({ page: null, loading: false, error: toBffError(error, response.status) });
        return;
      }
      setState({ page: toPrivacyPolicy(data), loading: false, error: null });
    } catch (err) {
      setState({ page: null, loading: false, error: err instanceof Error ? err : new Error('Network error') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
