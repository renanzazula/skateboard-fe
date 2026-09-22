import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useHomeCategoryAdmin } from '@/features/home/hooks/useHomeCategoryAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PUT: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;

describe('useHomeCategoryAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getConfig returns data and resets submitting', async () => {
    mockGet.mockResolvedValueOnce({ data: { mode: 'ALL' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useHomeCategoryAdmin());

    await expect(result.current.getConfig()).resolves.toEqual({ mode: 'ALL' });
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });

  it('getConfig throws on error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 400 } });
    const { result } = await renderHook(() => useHomeCategoryAdmin());

    await expect(result.current.getConfig()).rejects.toThrow('bad');
  });

  it('updateConfig puts the mode and category ids', async () => {
    mockPut.mockResolvedValueOnce({ data: { mode: 'CUSTOM' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useHomeCategoryAdmin());

    await expect(result.current.updateConfig('CUSTOM' as never, ['1', '2'])).resolves.toEqual({ mode: 'CUSTOM' });
    expect(mockPut).toHaveBeenCalledWith('/api/config/home/video-categories', {
      body: { mode: 'CUSTOM', enabledCategoryIds: ['1', '2'] },
    });
  });
});
