import { render, screen, userEvent } from '@testing-library/react-native';

import NotificationsScreen from '@/app/notifications';
import { useNotificationInbox } from '@/features/notifications/inbox/hooks/useNotificationInbox';
import type { InboxItem } from '@/features/notifications/inbox/types';
import { openNotificationTarget } from '@/features/notifications/pushNavigation';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/features/notifications/inbox/hooks/useNotificationInbox', () => ({
  useNotificationInbox: jest.fn(),
}));

jest.mock('@/features/notifications/pushNavigation', () => ({
  openNotificationTarget: jest.fn(),
}));

const mockUseInbox = useNotificationInbox as jest.Mock;

function item(id: string, read = false): InboxItem {
  return {
    notificationId: id,
    type: 'NEW_PODCAST',
    title: `Episode ${id}`,
    body: 'Out now',
    data: { targetType: 'PODCAST', targetSlug: `ep-${id}` },
    createdAt: new Date().toISOString(),
    readAt: null,
    read,
  };
}

function inbox(overrides: Record<string, unknown> = {}) {
  return {
    items: [],
    page: 0,
    hasMore: false,
    status: 'idle',
    error: null,
    loadedAt: '2026-09-28T12:00:00Z',
    unreadCount: 0,
    load: jest.fn(),
    refresh: jest.fn(),
    loadMore: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    ...overrides,
  };
}

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the inbox on open', async () => {
    const state = inbox();
    mockUseInbox.mockReturnValue(state);
    await render(<NotificationsScreen />);

    expect(state.load).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows the empty state when there is nothing', async () => {
    mockUseInbox.mockReturnValue(inbox());
    await render(<NotificationsScreen />);

    expect(screen.getByText('You’re all caught up')).toBeTruthy();
  });

  it('shows an error with retry when the first load fails', async () => {
    const state = inbox({ error: new Error('down') });
    mockUseInbox.mockReturnValue(state);
    const user = userEvent.setup();
    await render(<NotificationsScreen />);

    expect(screen.getByText('We couldn’t load your notifications.')).toBeTruthy();
    await user.press(screen.getByText('Retry'));
    expect(state.load).toHaveBeenCalledTimes(2);
  });

  it('marks a tapped item read and opens its target', async () => {
    const state = inbox({ items: [item('1')], unreadCount: 1 });
    mockUseInbox.mockReturnValue(state);
    const user = userEvent.setup();
    await render(<NotificationsScreen />);

    await user.press(screen.getByLabelText('Unread, Episode 1'));

    expect(state.markRead).toHaveBeenCalledWith('1');
    expect(openNotificationTarget).toHaveBeenCalledWith({ targetType: 'PODCAST', targetSlug: 'ep-1' }, 'inbox');
  });

  it('marks everything read from the header action', async () => {
    const state = inbox({ items: [item('1'), item('2', true)], unreadCount: 1 });
    mockUseInbox.mockReturnValue(state);
    const user = userEvent.setup();
    await render(<NotificationsScreen />);

    await user.press(screen.getByLabelText('Mark all as read'));

    expect(state.markAllRead).toHaveBeenCalledTimes(1);
  });

  it('disables mark-all when nothing is unread', async () => {
    const state = inbox({ items: [item('1', true)] });
    mockUseInbox.mockReturnValue(state);
    const user = userEvent.setup();
    await render(<NotificationsScreen />);

    await user.press(screen.getByLabelText('Mark all as read'));

    expect(state.markAllRead).not.toHaveBeenCalled();
  });
});
