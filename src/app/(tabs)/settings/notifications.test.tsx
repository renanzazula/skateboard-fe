import { render, screen, userEvent } from '@testing-library/react-native';

import NotificationsScreen from '@/app/(tabs)/settings/notifications';
import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import { getPushPermissionState, registerPushDevice } from '@/features/notifications';

jest.mock('@/features/account/hooks/useNotificationPreferences', () => ({
  useNotificationPreferences: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/features/notifications', () => ({
  getPushPermissionState: jest.fn(),
  registerPushDevice: jest.fn(),
}));

const mockUseNotificationPreferences = useNotificationPreferences as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockGetPushPermissionState = getPushPermissionState as jest.Mock;
const mockRegisterPushDevice = registerPushDevice as jest.Mock;

describe('NotificationsScreen', () => {
  const setPushEnabled = jest.fn();
  const setNewPodcastEnabled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { pushEnabled: false, newPodcastEnabled: true },
      setPushEnabled,
      setNewPodcastEnabled,
    });
    mockGetPushPermissionState.mockResolvedValue('granted');
  });

  it('renders the push and new-podcast switches from preferences', async () => {
    await render(<NotificationsScreen />);

    const switches = (await screen.findAllByRole('switch')).filter(
      (el) => el.props.accessibilityState?.checked !== undefined
    );
    expect(switches).toHaveLength(2);
    expect(switches[0].props.accessibilityState?.checked).toBe(false);
    expect(switches[1].props.accessibilityState?.checked).toBe(true);
  });

  it('shows a hint when push permission has been denied at the OS level', async () => {
    mockGetPushPermissionState.mockResolvedValue('denied');
    await render(<NotificationsScreen />);

    expect(
      await screen.findByText(
        'Notifications are turned off for this app in your device settings. These switches take effect once you allow them there.'
      )
    ).toBeTruthy();
  });

  it('registers the device and refreshes permission when push is turned on', async () => {
    setPushEnabled.mockResolvedValueOnce(undefined);
    mockRegisterPushDevice.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<NotificationsScreen />);
    await screen.findAllByRole('switch');

    await user.press(screen.getByText('Push notifications'));

    expect(setPushEnabled).toHaveBeenCalledWith(true);
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
  });

  it('toggles new podcast notifications directly', async () => {
    const user = userEvent.setup();
    await render(<NotificationsScreen />);
    await screen.findAllByRole('switch');

    await user.press(screen.getByText('New podcasts'));

    expect(setNewPodcastEnabled).toHaveBeenCalledWith(false);
  });
});
