import { Image } from 'expo-image';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchActiveCampaigns } from '@/features/campaign/api/fetchActiveCampaigns';
import { readCampaignConfigCache, writeCampaignConfigCache } from '@/features/campaign/cache/campaignConfigCache';
import { readExposure, recordShown } from '@/features/campaign/cache/campaignExposureStore';
import { resolveCampaign } from '@/features/campaign/resolver/resolveCampaign';
import { useCampaignResolver } from '@/features/campaign/hooks/useCampaignResolver';

jest.mock('expo-image', () => ({
  Image: { prefetch: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/features/campaign/api/fetchActiveCampaigns', () => ({
  fetchActiveCampaigns: jest.fn(),
}));

jest.mock('@/features/campaign/cache/campaignConfigCache', () => ({
  readCampaignConfigCache: jest.fn(),
  writeCampaignConfigCache: jest.fn(),
}));

jest.mock('@/features/campaign/cache/campaignExposureStore', () => ({
  readExposure: jest.fn(),
  recordShown: jest.fn(),
}));

jest.mock('@/features/campaign/resolver/resolveCampaign', () => ({
  resolveCampaign: jest.fn(),
}));

const mockFetch = fetchActiveCampaigns as jest.Mock;
const mockReadCache = readCampaignConfigCache as jest.Mock;
const mockWriteCache = writeCampaignConfigCache as jest.Mock;
const mockReadExposure = readExposure as jest.Mock;
const mockRecordShown = recordShown as jest.Mock;
const mockResolve = resolveCampaign as jest.Mock;

const CAMPAIGN = { id: 'c1', screens: [{ backgroundUrl: 'https://example.com/bg.png' }] };

describe('useCampaignResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockReadExposure.mockResolvedValue(null);
    mockWriteCache.mockResolvedValue(undefined);
    mockRecordShown.mockResolvedValue(undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('stays ready with no campaign when disabled', async () => {
    const { result } = await renderHook(() => useCampaignResolver(false));
    expect(result.current.phase).toBe('ready');
    expect(result.current.campaign).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resolves from a fresh cache without calling the network for the render', async () => {
    mockReadCache.mockResolvedValueOnce({ campaigns: [CAMPAIGN], fetchedAt: Date.now() });
    mockResolve.mockReturnValueOnce(CAMPAIGN);
    mockFetch.mockResolvedValueOnce([CAMPAIGN]);

    const { result } = await renderHook(() => useCampaignResolver(true));

    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.campaign).toBe(CAMPAIGN);
    expect(Image.prefetch).toHaveBeenCalledWith(CAMPAIGN.screens[0].backgroundUrl);
  });

  it('fetches fresh campaigns on a cold cache', async () => {
    mockReadCache.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce([CAMPAIGN]);
    mockResolve.mockReturnValueOnce(CAMPAIGN);

    const { result } = await renderHook(() => useCampaignResolver(true));

    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.campaign).toBe(CAMPAIGN);
    expect(mockWriteCache).toHaveBeenCalledWith([CAMPAIGN]);
  });

  it('resolves to no campaign when resolution fails', async () => {
    mockReadCache.mockRejectedValueOnce(new Error('cache read failed'));

    const { result } = await renderHook(() => useCampaignResolver(true));

    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.campaign).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('markShown records the campaign as shown for the session', async () => {
    mockReadCache.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce([]);
    mockResolve.mockReturnValueOnce(null);

    const { result } = await renderHook(() => useCampaignResolver(true));
    await waitFor(() => expect(result.current.phase).toBe('ready'));

    result.current.markShown('c1');

    expect(mockRecordShown).toHaveBeenCalledWith('c1');
  });
});
