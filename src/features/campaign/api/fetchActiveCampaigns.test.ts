import { bffClient } from '@/core/api/client';
import { fetchActiveCampaigns } from '@/features/campaign/api/fetchActiveCampaigns';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('fetchActiveCampaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the campaigns list on success', async () => {
    const campaigns = [{ id: '1' }, { id: '2' }];
    mockGet.mockResolvedValueOnce({ data: campaigns, error: undefined, response: { status: 200 } });

    await expect(fetchActiveCampaigns()).resolves.toBe(campaigns);
    expect(mockGet).toHaveBeenCalledWith('/api/campaigns/active');
  });

  it('throws a BffError when the response has an error body', async () => {
    mockGet.mockResolvedValueOnce({
      data: undefined,
      error: { code: 'BAD', message: 'nope' },
      response: { status: 400 },
    });

    await expect(fetchActiveCampaigns()).rejects.toThrow('nope');
  });

  it('throws a BffError when data is missing without an explicit error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 500 } });

    await expect(fetchActiveCampaigns()).rejects.toThrow();
  });
});
