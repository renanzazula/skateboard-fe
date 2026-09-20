import { renderHook } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useFeaturedPlayerAdmin } from '@/features/home/hooks/useFeaturedPlayerAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PUT: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;

describe('useFeaturedPlayerAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getConfig returns the config', async () => {
    mockGet.mockResolvedValueOnce({ data: { enabled: true }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useFeaturedPlayerAdmin());

    await expect(result.current.getConfig()).resolves.toEqual({ enabled: true });
  });

  it('getConfig throws on error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'denied' }, response: { status: 403 } });
    const { result } = await renderHook(() => useFeaturedPlayerAdmin());

    await expect(result.current.getConfig()).rejects.toThrow('denied');
  });

  it('updateConfig puts the full config body', async () => {
    const config = {
      enabled: true,
      contentSource: 'PODCAST' as never,
      contentId: '1',
      playerType: 'VIDEO' as never,
      position: 'TOP' as never,
      selectionMode: 'MANUAL' as never,
    };
    mockPut.mockResolvedValueOnce({ data: config, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useFeaturedPlayerAdmin());

    await expect(result.current.updateConfig(config)).resolves.toEqual(config);
    expect(mockPut).toHaveBeenCalledWith('/api/config/home/featured-player', { body: config });
  });
});
