import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useMyGuestApplication } from '@/features/guest-application/hooks/useMyGuestApplication';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useMyGuestApplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the application', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: '1', name: 'Jane', status: 'NEW' },
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useMyGuestApplication());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.application?.name).toBe('Jane');
  });

  it('treats a 404 as never applied, not an error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X' }, response: { status: 404 } });

    const { result } = await renderHook(() => useMyGuestApplication());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.application).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces a BFF error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });

    const { result } = await renderHook(() => useMyGuestApplication());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error?.message).toBe('bad');
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useMyGuestApplication());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error?.message).toBe('offline');
  });

  it('refetch reloads', async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { code: 'X' }, response: { status: 404 } });
    const { result } = await renderHook(() => useMyGuestApplication());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
