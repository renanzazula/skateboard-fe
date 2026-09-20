import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useCampaignList } from '@/features/campaign/admin/hooks/useCampaignList';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useCampaignList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads campaigns on mount', async () => {
    const campaigns = [{ id: '1' }];
    mockGet.mockResolvedValueOnce({ data: campaigns, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useCampaignList());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.campaigns).toBe(campaigns);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a BFF error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'nope' }, response: { status: 403 } });

    const { result } = await renderHook(() => useCampaignList());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.campaigns).toEqual([]);
    expect(result.current.error?.message).toBe('nope');
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useCampaignList());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('offline');
  });

  it('refetch reloads the list', async () => {
    mockGet.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCampaignList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
