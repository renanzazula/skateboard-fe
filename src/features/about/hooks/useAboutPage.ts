import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import { toAboutPage, type AboutPage } from '@/features/about/types';

interface AboutPageState {
  page: AboutPage | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Reads the published About Us page (GET /api/about-us). A `204` — nothing
 * published yet — resolves to `page: null` with no error, which drives the
 * viewer's empty state. Same load/refetch shape as
 * features/podcast/hooks/usePodcastPost.ts.
 */
export function useAboutPage() {
  const [state, setState] = useState<AboutPageState>({ page: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState({ page: null, loading: true, error: null });
    try {
      const { data, error, response } = await bffClient.GET('/api/about-us');
      if (response.status === 204) {
        setState({ page: null, loading: false, error: null });
        return;
      }
      if (error || !data) {
        setState({ page: null, loading: false, error: toBffError(error, response.status) });
        return;
      }
      setState({ page: toAboutPage(data), loading: false, error: null });
    } catch (err) {
      setState({ page: null, loading: false, error: err instanceof Error ? err : new Error('Network error') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
