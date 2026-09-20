import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useHomeFeaturedPlayer } from '@/features/home/hooks/useHomeFeaturedPlayer';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useHomeFeaturedPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the featured player content', async () => {
    mockGet.mockResolvedValueOnce({ data: { title: 'Featured' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useHomeFeaturedPlayer());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.content).toEqual({ title: 'Featured' });
  });

  it('treats a 204/no-data response as no player', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => useHomeFeaturedPlayer());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.content).toBeNull();
  });

  it('surfaces a BFF error without throwing', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });
    const { result } = await renderHook(() => useHomeFeaturedPlayer());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('bad');
    expect(result.current.content).toBeNull();
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderHook(() => useHomeFeaturedPlayer());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('offline');
  });

  it('refresh reloads', async () => {
    mockGet.mockResolvedValue({ data: null, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useHomeFeaturedPlayer());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.refresh();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
