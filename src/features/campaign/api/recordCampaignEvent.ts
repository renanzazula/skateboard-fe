import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { bffClient } from '@/core/api/client';
import type { CampaignEventRequest, CampaignEventType } from '@/features/campaign/types';

interface RecordEventInput {
  campaignId: string;
  eventType: CampaignEventType;
  screenId?: string;
  /** Only for CAMPAIGN_CTA_CLICKED. */
  actionTarget?: string;
}

/**
 * POST /api/campaigns/{id}/events — best-effort analytics. Pre-auth on the
 * BFF, and this must NEVER throw or block the campaign sequence: spec §12
 * ("must not prevent application access") and the backend contract ("never
 * fails the app"). Any failure is swallowed with a console warning.
 */
export async function recordCampaignEvent(input: RecordEventInput): Promise<void> {
  const body: CampaignEventRequest = {
    eventType: input.eventType,
    screenId: input.screenId,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? undefined,
    actionTarget: input.actionTarget,
  };

  try {
    await bffClient.POST('/api/campaigns/{campaignId}/events', {
      params: { path: { campaignId: input.campaignId } },
      body,
    });
  } catch (err) {
    console.warn(`[campaign] event ${input.eventType} for ${input.campaignId} not recorded`, err);
  }
}
