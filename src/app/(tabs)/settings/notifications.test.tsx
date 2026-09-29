import { render, screen, userEvent } from '@testing-library/react-native';

import NotificationsScreen from '@/app/(tabs)/settings/notifications';
import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import { getPushPermissionState, registerPushDevice } from '@/features/notifications';
import { showAlert } from '@/shared/utils/alert';

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

jest.mock('@/shared/utils/alert', () => ({
  showAlert: jest.fn(),
}));

const mockUseNotificationPreferences = useNotificationPreferences as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockGetPushPermissionState = getPushPermissionState as jest.Mock;
const mockRegisterPushDevice = registerPushDevice as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;

function getSwitches() {
  return screen.getAllByRole('switch').filter((el) => el.props.accessibilityState?.checked !== undefined);
}

describe('NotificationsScreen', () => {
  const setPushEnabled = jest.fn();
  const setNewPodcastEnabled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { pushEnabled: false, newPodcastEnabled: true },
      isLoading: false,
      error: null,
      setPushEnabled,
      setNewPodcastEnabled,
    });
    mockGetPushPermissionState.mockResolvedValue('granted');
  });

  it('renders the push and new-podcast switches from preferences', async () => {
    await render(<NotificationsScreen />);

    await screen.findAllByRole('switch');
    const switches = getSwitches();
    expect(switches).toHaveLength(2);
    expect(switches[0].props.accessibilityState?.checked).toBe(false);
    expect(switches[1].props.accessibilityState?.checked).toBe(true);
  });

  it('shows the podcast switch as off when the stored preference is off', async () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: { pushEnabled: true, newPodcastEnabled: false },
      isLoading: false,
      error: null,
      setPushEnabled,
      setNewPodcastEnabled,
    });
    await render(<NotificationsScreen />);

    await screen.findAllByRole('switch');
    expect(getSwitches()[1].props.accessibilityState?.checked).toBe(false);
  });

  it('defaults the podcast switch to on when loaded with no stored value', async () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: null,
      isLoading: false,
      error: null,
      setPushEnabled,
      setNewPodcastEnabled,
    });
    await render(<NotificationsScreen />);

    await screen.findAllByRole('switch');
    expect(getSwitches()[1].props.accessibilityState?.checked).toBe(true);
  });

  it('disables the switches while preferences are loading and does not toggle', async () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: null,
      isLoading: true,
      error: null,
      setPushEnabled,
      setNewPodcastEnabled,
    });
    const user = userEvent.setup();
    await render(<NotificationsScreen />);

    await screen.findAllByRole('switch');
    expect(getSwitches().every((el) => el.props.accessibilityState?.disabled === true)).toBe(true);

    await user.press(screen.getByText('New podcasts'));
    expect(setNewPodcastEnabled).not.toHaveBeenCalled();
  });

  it('disables the switches and shows the error when preferences fail to load', async () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: null,
      isLoading: false,
      error: new Error('offline'),
      setPushEnabled,
      setNewPodcastEnabled,
    });
    const user = userEvent.setup();
    await render(<NotificationsScreen />);

    await screen.findAllByRole('switch');
    expect(await screen.findByText('Something went wrong. offline')).toBeTruthy();
    expect(getSwitches().every((el) => el.props.accessibilityState?.disabled === true)).toBe(true);
    // Must not claim ON just because the load failed.
    expect(getSwitches()[1].props.accessibilityState?.checked).toBe(false);

    await user.press(screen.getByText('New podcasts'));
    expect(setNewPodcastEnabled).not.toHaveBeenCalled();
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
    setNewPodcastEnabled.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<NotificationsScreen />);
    await screen.findAllByRole('switch');

    await user.press(screen.getByText('New podcasts'));

    expect(setNewPodcastEnabled).toHaveBeenCalledWith(false);
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('alerts the user when saving the podcast preference fails', async () => {
    setNewPodcastEnabled.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    await render(<NotificationsScreen />);
    await screen.findAllByRole('switch');

    await user.press(screen.getByText('New podcasts'));

    expect(setNewPodcastEnabled).toHaveBeenCalledWith(false);
    expect(mockShowAlert).toHaveBeenCalledWith('Could not save', 'Try again.');
    // Still the stored value — nothing was saved.
    expect(getSwitches()[1].props.accessibilityState?.checked).toBe(true);
  });
});
