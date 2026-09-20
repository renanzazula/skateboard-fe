import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('usePodcastPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and maps the post', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: '1', title: 'Ep' }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => usePodcastPost('ep-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.post?.title).toBe('Ep');
    expect(mockGet).toHaveBeenCalledWith('/api/podcast/{slug}', { params: { path: { slug: 'ep-1' } } });
  });

  it('surfaces a BFF error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'missing' }, response: { status: 404 } });

    const { result } = await renderHook(() => usePodcastPost('missing'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.post).toBeNull();
    expect(result.current.error?.message).toBe('missing');
  });

  it('refetch reloads the post', async () => {
    mockGet.mockResolvedValue({ data: { id: '1', title: 'Ep' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => usePodcastPost('ep-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
