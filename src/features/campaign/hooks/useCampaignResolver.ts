import { Image } from 'expo-image';
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
/** Bounds how long the first screen's background image can hold the splash. */
const IMAGE_PRELOAD_TIMEOUT_MS = 1000;

/** ONCE_PER_SESSION state — survives component remounts, not an app restart. */
const sessionShownIds = new Set<string>();

type Phase = 'resolving' | 'ready';

interface ResolverState {
  phase: Phase;
  campaign: CampaignRuntime | null;
}

/**
 * Prefetches the chosen campaign's first screen background so `phase: 'ready'`
 * means "safe to render atomically" — `CampaignScreenView`'s `expo-image`
 * then serves it from cache instead of popping in after the text. Bounded and
 * never throws: a slow/broken image must not hold the splash hostage.
 */
async function preloadFirstScreenImage(campaign: CampaignRuntime | null): Promise<void> {
  const url = campaign?.screens?.[0]?.backgroundUrl;
  if (!url) return;
  await withTimeout(Image.prefetch(url), IMAGE_PRELOAD_TIMEOUT_MS, 'campaign image preload').catch(() => undefined);
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

    // `enabled` starts false while auth is still loading, so the initial
    // `phase` above was computed as 'ready' (nothing to resolve yet). Once
    // auth resolves and `enabled` flips true, announce 'resolving' before
    // the async work starts — otherwise `phase` stays stale at 'ready' for a
    // render or two, which would let a caller gating on `phase === 'ready'`
    // alone (e.g. the splash-hide check in `_layout.tsx`) act too early.
    setState((s) => (s.phase === 'ready' ? { ...s, phase: 'resolving' } : s));

    (async () => {
      try {
        const cache = await readCampaignConfigCache();
        const cacheFresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;

        if (cacheFresh) {
          const campaign = await pickCampaign(cache!.campaigns);
          await preloadFirstScreenImage(campaign);
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
        await preloadFirstScreenImage(campaign);
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
