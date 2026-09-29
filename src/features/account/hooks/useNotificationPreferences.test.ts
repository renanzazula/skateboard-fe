import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PATCH: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPatch = bffClient.PATCH as jest.Mock;

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads preferences on mount', async () => {
    mockGet.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: true, newPodcastEnabled: false } },
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences).toEqual({ pushEnabled: true, newPodcastEnabled: false });
    expect(mockGet).toHaveBeenCalledWith('/api/me/preferences');
  });

  it('sets an error when the load fails', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'offline' }, response: { status: 500 } });

    const { result } = await renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences).toBeNull();
    expect(result.current.error?.message).toBe('offline');
  });

  it('defaults preferences to null when notifications is missing', async () => {
    mockGet.mockResolvedValueOnce({ data: {}, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences).toBeNull();
  });

  it('setPushEnabled patches pushEnabled and applies the returned preferences', async () => {
    mockGet.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: false, newPodcastEnabled: false } },
      error: undefined,
      response: { status: 200 },
    });
    mockPatch.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: true, newPodcastEnabled: false } },
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.setPushEnabled(true);

    expect(mockPatch).toHaveBeenCalledWith('/api/me/preferences', { body: { notifications: { pushEnabled: true } } });
    await waitFor(() => expect(result.current.preferences).toEqual({ pushEnabled: true, newPodcastEnabled: false }));
  });

  it('setNewPodcastEnabled patches newPodcastEnabled', async () => {
    mockGet.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: true, newPodcastEnabled: false } },
      error: undefined,
      response: { status: 200 },
    });
    mockPatch.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: true, newPodcastEnabled: true } },
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.setNewPodcastEnabled(true);

    expect(mockPatch).toHaveBeenCalledWith('/api/me/preferences', { body: { notifications: { newPodcastEnabled: true } } });
  });

  it('setNewPodcastEnabled sends only newPodcastEnabled and leaves pushEnabled as returned', async () => {
    mockGet.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: false, newPodcastEnabled: true } },
      error: undefined,
      response: { status: 200 },
    });
    mockPatch.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: false, newPodcastEnabled: false } },
      error: undefined,
      response: { status: 200 },
    });

    const { result } = await renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.setNewPodcastEnabled(false);

    const body = mockPatch.mock.calls[0][1].body;
    expect(body).toEqual({ notifications: { newPodcastEnabled: false } });
    expect(body.notifications).not.toHaveProperty('pushEnabled');
    await waitFor(() => expect(result.current.preferences).toEqual({ pushEnabled: false, newPodcastEnabled: false }));
  });

  it('update throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: { notifications: { pushEnabled: false } }, error: undefined, response: { status: 200 } });
    mockPatch.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'denied' }, response: { status: 403 } });

    const { result } = await renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.setPushEnabled(true)).rejects.toThrow('denied');
  });

  it('keeps the previously loaded preferences when a save fails', async () => {
    mockGet.mockResolvedValueOnce({
      data: { notifications: { pushEnabled: true, newPodcastEnabled: true } },
      error: undefined,
      response: { status: 200 },
    });
    mockPatch.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'denied' }, response: { status: 500 } });

    const { result } = await renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.setNewPodcastEnabled(false)).rejects.toThrow('denied');

    expect(result.current.preferences).toEqual({ pushEnabled: true, newPodcastEnabled: true });
  });
});
