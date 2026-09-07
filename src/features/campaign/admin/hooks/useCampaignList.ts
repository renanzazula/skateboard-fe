import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import type { Campaign } from '@/features/campaign/types';

interface State {
  campaigns: Campaign[];
  loading: boolean;
  error: Error | null;
}

/**
 * GET /api/campaigns/admin — the admin list (all statuses). Gated by
 * FUNC_CAMPAIGN_READ at the call site. Same load/refetch shape as
 * features/about/hooks/useAboutPage.ts.
 */
export function useCampaignList() {
  const [state, setState] = useState<State>({ campaigns: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error, response } = await bffClient.GET('/api/campaigns/admin');
      if (error || !data) {
        setState({ campaigns: [], loading: false, error: toBffError(error, response.status) });
        return;
      }
      setState({ campaigns: data, loading: false, error: null });
    } catch (err) {
      setState({ campaigns: [], loading: false, error: err instanceof Error ? err : new Error('Network error') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
