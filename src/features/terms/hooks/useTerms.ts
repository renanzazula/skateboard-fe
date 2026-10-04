import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import { toTerms, type Terms } from '@/features/terms/types';

interface TermsState {
  page: Terms | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Reads the published Terms & Conditions page (GET /api/terms) for any
 * authenticated user. A `204` — nothing published yet — resolves to
 * `page: null` with no error, same as features/about/hooks/useAboutPage.ts.
 */
export function useTerms() {
  const [state, setState] = useState<TermsState>({ page: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState({ page: null, loading: true, error: null });
    try {
      const { data, error, response } = await bffClient.GET('/api/terms');
      if (response.status === 204) {
        setState({ page: null, loading: false, error: null });
        return;
      }
      if (error || !data) {
        setState({ page: null, loading: false, error: toBffError(error, response.status) });
        return;
      }
      setState({ page: toTerms(data), loading: false, error: null });
    } catch (err) {
      setState({ page: null, loading: false, error: err instanceof Error ? err : new Error('Network error') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
