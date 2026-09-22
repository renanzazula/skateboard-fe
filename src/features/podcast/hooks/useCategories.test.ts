import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useCategories } from '@/features/podcast/hooks/useCategories';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads categories and picks the default one', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        { id: '1', slug: 'news', name: 'News', default: false },
        { id: '2', slug: 'podcasts', name: 'Podcasts', default: true },
      ],
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.categories).toHaveLength(2);
    expect(result.current.defaultCategory?.slug).toBe('podcasts');
  });

  it('falls back to the "podcasts" slug when nothing is flagged default', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: '1', slug: 'news' }, { id: '2', slug: 'podcasts' }],
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.defaultCategory?.slug).toBe('podcasts');
  });

  it('falls back to the first category when neither default nor "podcasts" exist', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: '1', slug: 'other' }], error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.defaultCategory?.slug).toBe('other');
  });

  it('surfaces a BFF error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });

    const { result } = await renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe('bad');
    expect(result.current.categories).toEqual([]);
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe('offline');
  });
});
