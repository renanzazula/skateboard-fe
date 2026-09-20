import { renderHook, act } from '@testing-library/react-native';

import { useAppConfig } from '@/core/config/useAppConfig';
import * as appConfigStore from '@/core/config/appConfigStore';

jest.mock('@/core/config/appConfigStore', () => ({
  subscribe: jest.fn(),
  getState: jest.fn(),
}));

const mockSubscribe = appConfigStore.subscribe as jest.Mock;
const mockGetState = appConfigStore.getState as jest.Mock;

describe('useAppConfig', () => {
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
    mockGetState.mockReturnValue({ status: 'loading', loginBackgroundUrl: null });
  });

  it('returns the current app config state', async () => {
    mockGetState.mockReturnValue({ status: 'ready', loginBackgroundUrl: 'https://x/bg.png' });
    const { result } = await renderHook(() => useAppConfig());

    expect(result.current).toEqual({ status: 'ready', loginBackgroundUrl: 'https://x/bg.png' });
  });

  it('re-renders when the store notifies subscribers', async () => {
    const { result, rerender } = await renderHook(() => useAppConfig());
    expect(result.current.status).toBe('loading');

    mockGetState.mockReturnValue({ status: 'error', loginBackgroundUrl: null });
    await act(async () => {
      listeners.forEach((listener) => listener());
    });
    rerender({});

    expect(result.current.status).toBe('error');
  });
});
