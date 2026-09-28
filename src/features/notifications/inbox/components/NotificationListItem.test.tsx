import { render, screen, userEvent } from '@testing-library/react-native';

import { NotificationListItem } from '@/features/notifications/inbox/components/NotificationListItem';
import type { InboxItem } from '@/features/notifications/inbox/types';

const NOW = Date.parse('2026-09-28T12:00:00Z');

function item(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    notificationId: 'n-1',
    type: 'NEW_PODCAST',
    title: 'New podcast available',
    body: 'Skateboard Podcast #14',
    data: {},
    createdAt: '2026-09-24T12:00:00Z',
    readAt: null,
    read: false,
    ...overrides,
  };
}

describe('NotificationListItem', () => {
  it('renders title, body and a relative age for an unread item', async () => {
    await render(<NotificationListItem item={item()} now={NOW} onPress={jest.fn()} />);

    expect(screen.getByText('New podcast available')).toBeTruthy();
    expect(screen.getByText('Skateboard Podcast #14')).toBeTruthy();
    expect(screen.getByText('4 d ago')).toBeTruthy();
    expect(screen.getByTestId('notification-dot-unread')).toBeTruthy();
    expect(screen.getByLabelText('Unread, New podcast available')).toBeTruthy();
  });

  it('shows a hollow dot once read', async () => {
    await render(
      <NotificationListItem item={item({ read: true, readAt: '2026-09-25T00:00:00Z' })} now={NOW} onPress={jest.fn()} />
    );

    expect(screen.getByTestId('notification-dot-read')).toBeTruthy();
    expect(screen.getByLabelText('New podcast available')).toBeTruthy();
  });

  it.each([
    ['2026-09-28T11:59:50Z', 'now'],
    ['2026-09-28T11:45:00Z', '15 min ago'],
    ['2026-09-28T09:00:00Z', '3 h ago'],
    ['2026-09-14T12:00:00Z', '2 w ago'],
  ])('labels %p as %p', async (createdAt, label) => {
    await render(<NotificationListItem item={item({ createdAt })} now={NOW} onPress={jest.fn()} />);

    expect(screen.getByText(label)).toBeTruthy();
  });

  it('falls back to the date for old notifications', async () => {
    const createdAt = '2026-06-01T12:00:00Z';
    await render(<NotificationListItem item={item({ createdAt, body: '' })} now={NOW} onPress={jest.fn()} />);

    expect(screen.getByText(new Date(createdAt).toLocaleDateString())).toBeTruthy();
  });

  it('reports the pressed item', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const pressed = item();
    await render(<NotificationListItem item={pressed} now={NOW} onPress={onPress} />);

    await user.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledWith(pressed);
  });
});
