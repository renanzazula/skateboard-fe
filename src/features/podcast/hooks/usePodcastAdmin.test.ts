import { renderHook } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), DELETE: jest.fn() },
}));

const mockPost = bffClient.POST as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;
const mockDelete = bffClient.DELETE as jest.Mock;

describe('usePodcastAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createPost posts the input and returns the created post', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: '1' }, error: undefined, response: { status: 201 } });
    const { result } = await renderHook(() => usePodcastAdmin());

    await expect(result.current.createPost({ title: 'x' } as never)).resolves.toEqual({ id: '1' });
    expect(mockPost).toHaveBeenCalledWith('/api/podcast', { body: { title: 'x' } });
  });

  it('createPost throws on error', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 400 } });
    const { result } = await renderHook(() => usePodcastAdmin());

    await expect(result.current.createPost({} as never)).rejects.toThrow('bad');
  });

  it('updatePost puts the input', async () => {
    mockPut.mockResolvedValueOnce({ data: { id: '1', title: 'y' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => usePodcastAdmin());

    await expect(result.current.updatePost('1', { title: 'y' } as never)).resolves.toEqual({ id: '1', title: 'y' });
  });

  it('deletePost calls DELETE', async () => {
    mockDelete.mockResolvedValueOnce({ error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => usePodcastAdmin());

    await expect(result.current.deletePost('1')).resolves.toBeUndefined();
  });

  it('importPosts posts the import payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { imported: 3 }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => usePodcastAdmin());

    await expect(result.current.importPosts({ posts: [] } as never)).resolves.toEqual({ imported: 3 });
  });

  it('triggerSync posts to the sync endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { synced: 5 }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => usePodcastAdmin());

    await expect(result.current.triggerSync()).resolves.toEqual({ synced: 5 });
    expect(mockPost).toHaveBeenCalledWith('/api/podcast/sync');
  });
});
