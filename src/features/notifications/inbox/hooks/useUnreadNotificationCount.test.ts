import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useUnreadNotificationCount } from '@/features/notifications/inbox/hooks/useUnreadNotificationCount';
import * as inboxStore from '@/features/notifications/inbox/inboxStore';

jest.mock('@/features/notifications/inbox/inboxStore', () => ({
  subscribe: jest.fn(() => () => {}),
  getState: jest.fn(() => ({ unreadCount: 3 })),
  refreshUnreadCount: jest.fn(),
}));

const mockRefresh = inboxStore.refreshUnreadCount as jest.Mock;

describe('useUnreadNotificationCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the store count and refreshes it on mount', async () => {
    const { result } = await renderHook(() => useUnreadNotificationCount());

    expect(result.current).toBe(3);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes again only on a real return to the foreground', async () => {
    let listener: ((state: string) => void) | undefined;
    const remove = jest.fn();
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
      listener = cb as (state: string) => void;
      return { remove } as never;
    });
    const { unmount } = await renderHook(() => useUnreadNotificationCount());
    mockRefresh.mockClear();

    await act(async () => listener?.('active'));
    expect(mockRefresh).not.toHaveBeenCalled();

    await act(async () => listener?.('background'));
    await act(async () => listener?.('active'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
