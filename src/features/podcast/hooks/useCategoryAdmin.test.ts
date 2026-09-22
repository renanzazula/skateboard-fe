import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useCategoryAdmin } from '@/features/podcast/hooks/useCategoryAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PATCH: jest.fn(), PUT: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPatch = bffClient.PATCH as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;

describe('useCategoryAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listCategories returns the list', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: '1' }], error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCategoryAdmin());

    await expect(result.current.listCategories()).resolves.toEqual([{ id: '1' }]);
  });

  it('listCategories defaults to an empty array', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCategoryAdmin());

    await expect(result.current.listCategories()).resolves.toEqual([]);
  });

  it('listCategories throws on error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'denied' }, response: { status: 403 } });
    const { result } = await renderHook(() => useCategoryAdmin());

    await expect(result.current.listCategories()).rejects.toThrow('denied');
  });

  it('renameCategory patches and toggles submitting', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: '1', name: 'New' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCategoryAdmin());

    const updated = await result.current.renameCategory('1', 'New');

    expect(updated).toEqual({ id: '1', name: 'New' });
    expect(mockPatch).toHaveBeenCalledWith('/api/admin/categories/{id}', { params: { path: { id: '1' } }, body: { name: 'New' } });
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });

  it('reorderCategories puts the new order', async () => {
    mockPut.mockResolvedValueOnce({ data: [{ id: '2' }, { id: '1' }], error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCategoryAdmin());

    await expect(result.current.reorderCategories(['2', '1'])).resolves.toEqual([{ id: '2' }, { id: '1' }]);
  });

  it('setDefaultCategory puts the new default', async () => {
    mockPut.mockResolvedValueOnce({ data: { id: '1' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCategoryAdmin());

    await expect(result.current.setDefaultCategory('1')).resolves.toEqual({ id: '1' });
  });

  it('renameCategory throws and still resets submitting', async () => {
    mockPatch.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 400 } });
    const { result } = await renderHook(() => useCategoryAdmin());

    await expect(result.current.renameCategory('1', null)).rejects.toThrow('bad');
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
