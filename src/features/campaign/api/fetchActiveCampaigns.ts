import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import type { CampaignRuntime } from '@/features/campaign/types';

/**
 * GET /api/campaigns/active — the anonymous runtime feed. The BFF permits
 * this without a token; the auth middleware still attaches the bearer when
 * the user is signed in, so AUTHENTICATED-audience campaigns are included.
 * The list is already filtered by schedule/status/audience and sorted by
 * priority server-side — the client only applies local frequency capping.
 */
export async function fetchActiveCampaigns(): Promise<CampaignRuntime[]> {
  const { data, error, response } = await bffClient.GET('/api/campaigns/active');
  if (error || !data) {
    throw toBffError(error, response.status);
  }
  return data;
}
