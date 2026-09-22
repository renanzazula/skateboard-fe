import { renderHook, act } from '@testing-library/react-native';

import { useAuth } from '@/core/auth/useAuth';
import * as authStore from '@/core/auth/authStore';

jest.mock('@/core/auth/authStore', () => ({
  subscribe: jest.fn(),
  getState: jest.fn(),
  loginWithPassword: jest.fn(),
  loginWithGoogle: jest.fn(),
  logout: jest.fn(),
}));

const mockSubscribe = authStore.subscribe as jest.Mock;
const mockGetState = authStore.getState as jest.Mock;

describe('useAuth', () => {
  let listeners: Array<() => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners = [];
    mockSubscribe.mockImplementation((listener: () => void) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    });
    mockGetState.mockReturnValue({
      status: 'signedOut',
      authorities: [],
      email: null,
    });
  });

  it('exposes the current state plus the store actions', async () => {
    mockGetState.mockReturnValue({
      status: 'signedIn',
      authorities: ['ROLE_ADMIN'],
      email: 'a@b.com',
    });
    const { result } = await renderHook(() => useAuth());

    expect(result.current.status).toBe('signedIn');
    expect(result.current.authorities).toEqual(['ROLE_ADMIN']);
    expect(result.current.email).toBe('a@b.com');
    expect(result.current.loginWithPassword).toBe(authStore.loginWithPassword);
    expect(result.current.loginWithGoogle).toBe(authStore.loginWithGoogle);
    expect(result.current.logout).toBe(authStore.logout);
  });

  it('hasAuthority reflects whether the authority is present in state', async () => {
    mockGetState.mockReturnValue({
      status: 'signedIn',
      authorities: ['ROLE_ADMIN'],
      email: 'a@b.com',
    });
    const { result } = await renderHook(() => useAuth());

    expect(result.current.hasAuthority('ROLE_ADMIN')).toBe(true);
    expect(result.current.hasAuthority('ROLE_OTHER')).toBe(false);
  });

  it('re-renders when the store notifies subscribers', async () => {
    const { result, rerender } = await renderHook(() => useAuth());
    expect(result.current.status).toBe('signedOut');

    mockGetState.mockReturnValue({
      status: 'signedIn',
      authorities: [],
      email: 'a@b.com',
    });
    await act(async () => {
      listeners.forEach((listener) => listener());
    });
    rerender({});

    expect(result.current.status).toBe('signedIn');
    expect(result.current.email).toBe('a@b.com');
  });
});
