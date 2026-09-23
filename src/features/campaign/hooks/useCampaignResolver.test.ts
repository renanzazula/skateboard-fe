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

  it('flips straight to resolving on the same render `enabled` turns true, never a stale ready', async () => {
    // Never resolves within this test, so we can inspect the phase before
    // any async work finishes — this is the exact window the splash-hide
    // race used to slip through.
    mockReadCache.mockReturnValue(new Promise(() => undefined));

    const { result, rerender } = await renderHook((props: { enabled: boolean }) => useCampaignResolver(props.enabled), {
      initialProps: { enabled: false },
    });
    expect(result.current.phase).toBe('ready');

    await rerender({ enabled: true });

    expect(result.current.phase).toBe('resolving');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('prefetches the image for the campaign a background revalidation would pick, for next launch', async () => {
    const NEXT_CAMPAIGN = { id: 'c2', screens: [{ backgroundUrl: 'https://example.com/next.png' }] };
    mockReadCache.mockResolvedValueOnce({ campaigns: [CAMPAIGN], fetchedAt: Date.now() });
    mockResolve.mockReturnValueOnce(CAMPAIGN); // picked for the immediate render
    mockFetch.mockResolvedValueOnce([NEXT_CAMPAIGN]); // background revalidation fetch
    mockResolve.mockReturnValueOnce(NEXT_CAMPAIGN); // picked from the revalidated set

    const { result } = await renderHook(() => useCampaignResolver(true));
    await waitFor(() => expect(result.current.phase).toBe('ready'));

    await waitFor(() => expect(mockWriteCache).toHaveBeenCalledWith([NEXT_CAMPAIGN]));
    await waitFor(() => expect(Image.prefetch).toHaveBeenCalledWith(NEXT_CAMPAIGN.screens[0].backgroundUrl));
  });
});
