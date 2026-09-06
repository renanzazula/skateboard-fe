import { secureStorage } from '@/core/storage/secureStorage';
import { localDay } from '@/features/campaign/dates';
import type { CampaignExposure } from '@/features/campaign/types';

export { localDay };

/**
 * Per-campaign frequency state (plan gap #7). Small enough for `secureStorage`
 * (one `{lastShownAt, shownToday, day}` object per campaign) and consistent
 * with the other single-value keys the app keeps there
 * (`skateboard.settings.downloadWifiOnly`, `skateboard.language`). Evaluated
 * against device local time — DST/timezone edges are an accepted V1 limit.
 *
 * `ONCE_PER_SESSION` state is NOT persisted here — it lives in memory for the
 * lifetime of the JS runtime (see the resolver).
 */
const KEY_PREFIX = 'skateboard.campaign.exposure.';

export async function readExposure(campaignId: string): Promise<CampaignExposure | null> {
  try {
    const raw = await secureStorage.getItem(KEY_PREFIX + campaignId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignExposure;
    if (typeof parsed?.lastShownAt !== 'number' || typeof parsed.shownToday !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Record that a campaign was shown now: bumps today's count, rolling over at midnight. */
export async function recordShown(campaignId: string, now: Date = new Date()): Promise<void> {
  const today = localDay(now);
  const prev = await readExposure(campaignId);
  const shownToday = prev && prev.day === today ? prev.shownToday + 1 : 1;
  const next: CampaignExposure = { lastShownAt: now.getTime(), shownToday, day: today };
  try {
    await secureStorage.setItem(KEY_PREFIX + campaignId, JSON.stringify(next));
  } catch (err) {
    console.warn('[campaign] could not persist exposure', err);
  }
}

export async function clearExposure(campaignId: string): Promise<void> {
  try {
    await secureStorage.deleteItem(KEY_PREFIX + campaignId);
  } catch {
    // best-effort
  }
}
