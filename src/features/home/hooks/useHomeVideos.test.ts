import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useHomeVideos } from '@/features/home/hooks/useHomeVideos';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useHomeVideos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and shuffles the videos', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: '1' }, { id: '2' }, { id: '3' }],
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useHomeVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.videos.map((v) => v.id).sort()).toEqual(['1', '2', '3']);
  });

  it('surfaces a BFF error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });
    const { result } = await renderHook(() => useHomeVideos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('bad');
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderHook(() => useHomeVideos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('offline');
  });

  it('reloadHome reshuffles without refetching', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: '1' }, { id: '2' }], error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useHomeVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.reloadHome();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result.current.videos.map((v) => v.id).sort()).toEqual(['1', '2']);
  });

  it('refresh refetches', async () => {
    mockGet.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useHomeVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.refresh();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
