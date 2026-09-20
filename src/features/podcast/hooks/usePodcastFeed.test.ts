import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { usePodcastFeed } from '@/features/podcast/hooks/usePodcastFeed';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('usePodcastFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads page 0 for the given category', async () => {
    mockGet.mockResolvedValueOnce({
      data: { posts: [{ id: '1' }], total: 20 },
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => usePodcastFeed('news'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.posts).toHaveLength(1);
    expect(result.current.total).toBe(20);
    expect(result.current.hasMore).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('/api/categories/{slug}/posts', {
      params: { path: { slug: 'news' }, query: { page: 0, size: 10 } },
    });
  });

  it('does nothing when categorySlug is undefined', async () => {
    const { result } = await renderHook(() => usePodcastFeed(undefined));
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('loadMore appends the next page', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { posts: [{ id: '1' }], total: 2 }, error: undefined, response: { status: 200 } })
      .mockResolvedValueOnce({ data: { posts: [{ id: '2' }], total: 2 }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => usePodcastFeed('news'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.loadMore();

    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    expect(result.current.hasMore).toBe(false);
  });

  it('refresh reloads from page 0', async () => {
    mockGet.mockResolvedValue({ data: { posts: [{ id: '1' }], total: 1 }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => usePodcastFeed('news'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.refresh();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('surfaces a BFF error on page 0', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });

    const { result } = await renderHook(() => usePodcastFeed('news'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe('bad');
    expect(result.current.posts).toEqual([]);
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => usePodcastFeed('news'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe('offline');
  });
});
