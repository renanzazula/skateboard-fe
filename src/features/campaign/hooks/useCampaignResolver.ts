import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchActiveCampaigns } from '@/features/campaign/api/fetchActiveCampaigns';
import { readCampaignConfigCache, writeCampaignConfigCache } from '@/features/campaign/cache/campaignConfigCache';
import { readExposure, recordShown } from '@/features/campaign/cache/campaignExposureStore';
import { resolveCampaign } from '@/features/campaign/resolver/resolveCampaign';
import type { CampaignExposure, CampaignRuntime } from '@/features/campaign/types';
import { withTimeout } from '@/shared/utils/withTimeout';

/** Cache is "fresh enough" to render from without waiting on the network. */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Hard budget for resolving on a cold cache — past this the app just starts. */
const RESOLVE_BUDGET_MS = 2500;

/** ONCE_PER_SESSION state — survives component remounts, not an app restart. */
const sessionShownIds = new Set<string>();

type Phase = 'resolving' | 'ready';

interface ResolverState {
  phase: Phase;
  campaign: CampaignRuntime | null;
}

async function pickCampaign(campaigns: CampaignRuntime[]): Promise<CampaignRuntime | null> {
  const exposure: Record<string, CampaignExposure | null> = {};
  await Promise.all(
    campaigns
      .map((c) => c.id)
      .filter((id): id is string => !!id)
      .map(async (id) => {
        exposure[id] = await readExposure(id);
      })
  );
  return resolveCampaign({ campaigns, exposure, sessionShownIds });
}

/**
 * Resolves which campaign (if any) to show at startup. Stale-while-revalidate:
 * a fresh cache renders immediately while a new copy is fetched for next
 * launch; a cold cache waits on the network, bounded by RESOLVE_BUDGET_MS.
 * Any failure resolves to `{ phase: 'ready', campaign: null }` — campaigns
 * never block app start (spec §12).
 */
export function useCampaignResolver(enabled: boolean): ResolverState & { markShown: (id: string) => void } {
  const [state, setState] = useState<ResolverState>({
    phase: enabled ? 'resolving' : 'ready',
    campaign: null,
  });
  const done = useRef(false);

  useEffect(() => {
    if (!enabled || done.current) return;
    done.current = true;
    let cancelled = false;

    (async () => {
      try {
        const cache = await readCampaignConfigCache();
        const cacheFresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;

        if (cacheFresh) {
          const campaign = await pickCampaign(cache!.campaigns);
          if (!cancelled) setState({ phase: 'ready', campaign });
          // Revalidate for next launch, don't swap mid-session.
          fetchActiveCampaigns()
            .then(writeCampaignConfigCache)
            .catch(() => undefined);
          return;
        }

        const campaigns = await withTimeout(fetchActiveCampaigns(), RESOLVE_BUDGET_MS, 'campaign resolve');
        writeCampaignConfigCache(campaigns).catch(() => undefined);
        const campaign = await pickCampaign(campaigns);
        if (!cancelled) setState({ phase: 'ready', campaign });
      } catch (err) {
        console.warn('[campaign] resolve failed, skipping', err);
        if (!cancelled) setState({ phase: 'ready', campaign: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const markShown = useCallback((id: string) => {
    sessionShownIds.add(id);
    recordShown(id).catch(() => undefined);
  }, []);

  return { ...state, markShown };
}
