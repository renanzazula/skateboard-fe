import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useFeaturedContentPicker } from '@/features/home/hooks/useFeaturedContentPicker';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useFeaturedContentPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads page 0 with an empty search on mount', async () => {
    mockGet.mockResolvedValueOnce({ data: { posts: [{ id: '1' }], total: 1 }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useFeaturedContentPicker());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.posts).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith('/api/podcast', { params: { query: { page: 0, size: 20, search: undefined } } });
  });

  it('re-searches when the search term changes', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { posts: [], total: 0 }, error: undefined, response: { status: 200 } })
      .mockResolvedValueOnce({ data: { posts: [{ id: '2' }], total: 1 }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useFeaturedContentPicker());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.setSearch('skate');

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockGet).toHaveBeenLastCalledWith('/api/podcast', { params: { query: { page: 0, size: 20, search: 'skate' } } });
  });

  it('loadMore appends the next page', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { posts: [{ id: '1' }], total: 2 }, error: undefined, response: { status: 200 } })
      .mockResolvedValueOnce({ data: { posts: [{ id: '2' }], total: 2 }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useFeaturedContentPicker());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.loadMore();

    await waitFor(() => expect(result.current.posts).toHaveLength(2));
    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore is a no-op when there is nothing more to load', async () => {
    mockGet.mockResolvedValueOnce({ data: { posts: [{ id: '1' }], total: 1 }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useFeaturedContentPicker());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.loadMore();

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('surfaces a BFF error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });
    const { result } = await renderHook(() => useFeaturedContentPicker());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('bad');
  });
});
