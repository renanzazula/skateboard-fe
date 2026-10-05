import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useGuestApplicationAvailability } from '@/features/guest-application/hooks/useGuestApplicationAvailability';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useGuestApplicationAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the enabled flag', async () => {
    mockGet.mockResolvedValueOnce({ data: { enabled: true }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useGuestApplicationAvailability());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.enabled).toBe(true);
  });

  it('surfaces a BFF error and defaults enabled to false', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });

    const { result } = await renderHook(() => useGuestApplicationAvailability());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.enabled).toBe(false);
    expect(result.current.error?.message).toBe('bad');
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useGuestApplicationAvailability());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error?.message).toBe('offline');
  });

  it('refetch reloads', async () => {
    mockGet.mockResolvedValue({ data: { enabled: false }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useGuestApplicationAvailability());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
