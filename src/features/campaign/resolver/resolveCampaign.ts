import { localDay } from '@/features/campaign/dates';
import type { CampaignExposure, CampaignRuntime } from '@/features/campaign/types';

export interface ResolveInput {
  /** From `GET /api/campaigns/active` — already filtered by schedule/status/audience and sorted by priority desc. */
  campaigns: CampaignRuntime[];
  /** Persisted frequency state, keyed by campaign id. Absent = never shown. */
  exposure: Record<string, CampaignExposure | null | undefined>;
  /** Campaign ids already shown in this JS-runtime session (for ONCE_PER_SESSION). */
  sessionShownIds: ReadonlySet<string>;
  now?: Date;
}

/**
 * Picks the single campaign to display now — the highest-priority one whose
 * frequency rule still allows it (spec §12). The server already did the
 * schedule/status/audience filtering and priority sort, so this only applies
 * the client-local frequency cap. Returns null when nothing is eligible.
 *
 * Pure and synchronous so it is trivially unit-testable; the caller loads the
 * exposure records first.
 */
export function resolveCampaign(input: ResolveInput): CampaignRuntime | null {
  const now = input.now ?? new Date();
  const today = localDay(now);

  for (const campaign of input.campaigns) {
    if (!campaign.id || !campaign.screens || campaign.screens.length === 0) continue;
    const seen = input.exposure[campaign.id] ?? null;

    if (isAllowedByFrequency(campaign, seen, today, input.sessionShownIds)) {
      return campaign;
    }
  }
  return null;
}

function isAllowedByFrequency(
  campaign: CampaignRuntime,
  seen: CampaignExposure | null,
  today: string,
  sessionShownIds: ReadonlySet<string>
): boolean {
  switch (campaign.frequencyType) {
    case 'ALWAYS':
      return true;
    case 'ONCE':
      return seen === null;
    case 'ONCE_PER_SESSION':
      return !sessionShownIds.has(campaign.id!);
    case 'ONCE_PER_DAY':
      return seen === null || seen.day !== today;
    case 'MAX_PER_DAY': {
      const cap = campaign.maxDisplaysPerDay ?? 1;
      if (seen === null || seen.day !== today) return true;
      return seen.shownToday < cap;
    }
    default:
      // Unknown frequency type from a newer backend — fail safe: don't show.
      return false;
  }
}
