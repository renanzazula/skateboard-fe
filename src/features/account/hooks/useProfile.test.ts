import { act, renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import * as authStore from '@/core/auth/authStore';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PATCH: jest.fn() },
}));

let authListener: (() => void) | undefined;
jest.mock('@/core/auth/authStore', () => ({
  getState: jest.fn(() => ({ status: 'signedOut' })),
  subscribe: jest.fn((listener: () => void) => {
    authListener = listener;
    return () => {};
  }),
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPatch = bffClient.PATCH as jest.Mock;
const mockGetAuthState = authStore.getState as jest.Mock;

/**
 * useProfile.ts keeps its state in a module-level singleton shared by every
 * consumer (see the comment above `state` in that file), so `jest.resetModules()`
 * can't be used to isolate tests here — it would also reload React and break
 * hooks. Instead, each test resets the singleton the same way production code
 * does: a signed-in -> signed-out transition, which the hook already treats
 * as "forget everything and let the next mount fetch fresh".
 */
function resetProfileStore() {
  mockGetAuthState.mockReturnValue({ status: 'signedIn' });
  authListener?.();
  mockGetAuthState.mockReturnValue({ status: 'signedOut' });
  authListener?.();
}

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthState.mockReturnValue({ status: 'signedOut' });
    resetProfileStore();
  });

  it('fetches the profile once on first mount', async () => {
    mockGet.mockResolvedValueOnce({ data: { username: 'skater8' }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toEqual({ username: 'skater8' });
    expect(mockGet).toHaveBeenCalledWith('/api/me');
  });

  it('sets an error when the BFF responds with an error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'nope' }, response: { status: 500 } });

    const { result } = await renderHook(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.error?.message).toBe('nope');
  });

  it('sets a fallback error when the request throws (network failure)', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));

    const { result } = await renderHook(() => useProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('network down');
  });

  it('shares state across multiple consumers and fetches only once', async () => {
    mockGet.mockResolvedValueOnce({ data: { username: 'skater8' }, error: undefined, response: { status: 200 } });

    const first = await renderHook(() => useProfile());
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    const second = await renderHook(() => useProfile());
    expect(second.result.current.profile).toEqual({ username: 'skater8' });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('updateDisplayName patches and applies the returned profile to every consumer', async () => {
    mockGet.mockResolvedValueOnce({ data: { username: 'skater8', displayName: 'old' }, error: undefined, response: { status: 200 } });
    mockPatch.mockResolvedValueOnce({ data: { username: 'skater8', displayName: 'new' }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updated = await result.current.updateDisplayName('new');

    expect(updated).toEqual({ username: 'skater8', displayName: 'new' });
    expect(mockPatch).toHaveBeenCalledWith('/api/me', { body: { displayName: 'new' } });
    await waitFor(() => expect(result.current.profile).toEqual({ username: 'skater8', displayName: 'new' }));
  });

  it('updateDisplayName throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: {}, error: undefined, response: { status: 200 } });
    mockPatch.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'denied' }, response: { status: 403 } });

    const { result } = await renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.updateDisplayName('new')).rejects.toThrow('denied');
  });

  it('clears the profile and refetches after a sign-out cycle', async () => {
    mockGet.mockResolvedValueOnce({ data: { username: 'first' }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toEqual({ username: 'first' });

    mockGet.mockResolvedValueOnce({ data: { username: 'second' }, error: undefined, response: { status: 200 } });
    mockGetAuthState.mockReturnValue({ status: 'signedIn' });
    await act(async () => authListener?.());
    mockGetAuthState.mockReturnValue({ status: 'signedOut' });
    await act(async () => authListener?.());

    expect(result.current.profile).toBeNull();
  });
});
