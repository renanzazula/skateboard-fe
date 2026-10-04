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

  describe('search', () => {
    const ok = (posts: { id: string }[], total = posts.length) => ({
      data: { posts, total },
      error: undefined,
      response: { status: 200 },
    });

    it('sends the trimmed search term with the category request', async () => {
      mockGet.mockResolvedValueOnce(ok([{ id: '42' }]));

      const { result } = await renderHook(() => usePodcastFeed('news', '  ep 42 '));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledWith('/api/categories/{slug}/posts', {
        params: { path: { slug: 'news' }, query: { page: 0, size: 10, search: 'ep 42' } },
      });
    });

    it('omits search entirely for a blank term', async () => {
      mockGet.mockResolvedValueOnce(ok([{ id: '1' }]));

      await renderHook(() => usePodcastFeed('news', '   '));

      await waitFor(() =>
        expect(mockGet).toHaveBeenCalledWith('/api/categories/{slug}/posts', {
          params: { path: { slug: 'news' }, query: { page: 0, size: 10 } },
        })
      );
    });

    it('restarts from page 0 when the search changes, and again when it is cleared', async () => {
      mockGet
        .mockResolvedValueOnce(ok([{ id: '1' }, { id: '2' }], 30))
        .mockResolvedValueOnce(ok([{ id: '42' }]))
        .mockResolvedValueOnce(ok([{ id: '1' }, { id: '2' }], 30));

      const { result, rerender } = await renderHook(({ q }: { q: string }) => usePodcastFeed('news', q), {
        initialProps: { q: '' },
      });
      await waitFor(() => expect(result.current.total).toBe(30));

      await rerender({ q: '42' });
      await waitFor(() => expect(result.current.posts.map((p) => p.id)).toEqual(['42']));
      expect(result.current.hasMore).toBe(false);

      await rerender({ q: '' });
      await waitFor(() => expect(result.current.total).toBe(30));
      expect(result.current.posts).toHaveLength(2);
    });

    it('applies only the latest search when an earlier response arrives late', async () => {
      let resolveSlow: (value: unknown) => void = () => {};
      mockGet
        .mockReturnValueOnce(new Promise((resolve) => (resolveSlow = resolve)))
        .mockResolvedValueOnce(ok([{ id: '42' }]));

      const { result, rerender } = await renderHook(({ q }: { q: string }) => usePodcastFeed('news', q), {
        initialProps: { q: '4' },
      });
      await rerender({ q: '42' });
      await waitFor(() => expect(result.current.posts.map((p) => p.id)).toEqual(['42']));

      resolveSlow(ok([{ id: '4' }, { id: '14' }, { id: '40' }]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.posts.map((p) => p.id)).toEqual(['42']);
    });

    it('loadMore keeps the search term on later pages', async () => {
      mockGet.mockResolvedValueOnce(ok([{ id: '1' }], 2)).mockResolvedValueOnce(ok([{ id: '2' }], 2));

      const { result } = await renderHook(() => usePodcastFeed('news', 'skate'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.loadMore();
      await waitFor(() => expect(result.current.posts).toHaveLength(2));
      expect(mockGet).toHaveBeenLastCalledWith('/api/categories/{slug}/posts', {
        params: { path: { slug: 'news' }, query: { page: 1, size: 10, search: 'skate' } },
      });
    });

    it('collapses an identical refresh into the request already in flight', async () => {
      let resolveFirst: (value: unknown) => void = () => {};
      mockGet.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)));

      const { result } = await renderHook(() => usePodcastFeed('news', 'skate'));
      result.current.refresh(); // e.g. the focus refresh, while the mount load is still pending
      resolveFirst(ok([{ id: '1' }]));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });
});
