import Constants from 'expo-constants';

import { bffClient } from '@/core/api/client';
import { recordCampaignEvent } from '@/features/campaign/api/recordCampaignEvent';

jest.mock('@/core/api/client', () => ({
  bffClient: { POST: jest.fn() },
}));

const mockPost = bffClient.POST as jest.Mock;

describe('recordCampaignEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('posts the event with platform and app version', async () => {
    mockPost.mockResolvedValueOnce({ data: {}, error: undefined, response: { status: 200 } });

    await recordCampaignEvent({ campaignId: 'c1', eventType: 'CAMPAIGN_SHOWN', screenId: 's1' });

    expect(mockPost).toHaveBeenCalledWith('/api/campaigns/{campaignId}/events', {
      params: { path: { campaignId: 'c1' } },
      body: expect.objectContaining({
        eventType: 'CAMPAIGN_SHOWN',
        screenId: 's1',
        appVersion: Constants.expoConfig?.version ?? undefined,
      }),
    });
  });

  it('never throws when the request fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('network down'));

    await expect(recordCampaignEvent({ campaignId: 'c1', eventType: 'CAMPAIGN_CTA_CLICKED', actionTarget: '/x' })).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });
});
