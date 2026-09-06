import type { components } from '@/core/api/generated/schema';

/**
 * Campaign types come straight from the generated BFF schema
 * (api/bff-openapi.yaml's `campaign` tag). The runtime feed uses the lean
 * {@link CampaignRuntime} shape; the admin screens use the full
 * {@link Campaign}. See .docs/README-campaign-v1-fe-implementation-plan.md.
 */
export type CampaignRuntime = components['schemas']['CampaignRuntimeResponse'];
export type Campaign = components['schemas']['CampaignResponse'];
export type CampaignScreen = components['schemas']['CampaignScreenResponse'];
export type CampaignRequest = components['schemas']['CampaignRequest'];
export type CampaignScreenRequest = components['schemas']['CampaignScreenRequest'];
export type CampaignEventRequest = components['schemas']['CampaignEventRequest'];
export type ReorderCampaignScreensRequest = components['schemas']['ReorderCampaignScreensRequest'];

export type CampaignStatus = components['schemas']['CampaignStatus'];
export type CampaignAudience = components['schemas']['CampaignAudience'];
export type CampaignFrequencyType = components['schemas']['CampaignFrequencyType'];
export type CampaignActionType = components['schemas']['CampaignActionType'];
export type CampaignLayoutType = components['schemas']['CampaignLayoutType'];
export type CampaignTextAlignment = components['schemas']['CampaignTextAlignment'];
export type CampaignTextSize = components['schemas']['CampaignTextSize'];
export type CampaignEventType = components['schemas']['CampaignEventType'];

/** What the resolver stores per campaign to enforce frequency capping (gap #7). */
export interface CampaignExposure {
  /** Epoch ms of the last time this campaign was shown. */
  lastShownAt: number;
  /** How many times it was shown on `day`. */
  shownToday: number;
  /** Local calendar day (YYYY-MM-DD) that `shownToday` counts. */
  day: string;
}

/** The small config blob persisted between launches for stale-while-revalidate. */
export interface CampaignConfigCache {
  /** Epoch ms the campaigns were fetched. */
  fetchedAt: number;
  campaigns: CampaignRuntime[];
}

/**
 * The controlled set of internal CTA route prefixes, byte-identical to
 * skateboard-app-config-be's `CampaignScreen.ALLOWED_INTERNAL_ROUTE_PREFIXES`
 * (and the Admin FE target picker) — hand-synced, see the plan's gap #6. The
 * backend accepts a target that equals a prefix or starts with `prefix + "/"`.
 *
 * These are product-level destination names, not expo-router paths — the CTA
 * handler maps them onto the app's actual routes (see cta.ts).
 */
export const INTERNAL_CTA_PREFIXES = [
  '/home',
  '/podcasts',
  '/events',
  '/competitions',
  '/settings/about-us',
] as const;
