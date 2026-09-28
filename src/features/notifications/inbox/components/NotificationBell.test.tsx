import { router } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';

import { NotificationBell } from '@/features/notifications/inbox/components/NotificationBell';
import { useUnreadNotificationCount } from '@/features/notifications/inbox/hooks/useUnreadNotificationCount';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/features/notifications/inbox/hooks/useUnreadNotificationCount', () => ({
  useUnreadNotificationCount: jest.fn(),
}));

const mockCount = useUnreadNotificationCount as jest.Mock;

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the unread count as a badge', async () => {
    mockCount.mockReturnValue(6);
    await render(<NotificationBell />);

    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByLabelText('Open notifications, 6 unread')).toBeTruthy();
  });

  it('caps the badge at 99+', async () => {
    mockCount.mockReturnValue(250);
    await render(<NotificationBell />);

    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('hides the badge when nothing is unread', async () => {
    mockCount.mockReturnValue(0);
    await render(<NotificationBell />);

    expect(screen.queryByTestId('notification-bell-badge')).toBeNull();
    expect(screen.getByLabelText('Open notifications')).toBeTruthy();
  });

  it('opens the Notifications screen', async () => {
    mockCount.mockReturnValue(1);
    const user = userEvent.setup();
    await render(<NotificationBell />);

    await user.press(screen.getByRole('button'));

    expect(router.push).toHaveBeenCalledWith('/notifications');
  });
});
