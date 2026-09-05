import { router } from 'expo-router';
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings/index';
import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { useLocalSettings } from '@/features/settings/hooks/useLocalSettings';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
  setProfile: jest.fn(),
}));

jest.mock('@/features/settings/hooks/useLocalSettings', () => ({
  useLocalSettings: jest.fn(),
  LANGUAGE_FLAGS: { en: '🇺🇸' },
  LANGUAGE_LABELS: { en: 'English' },
}));

// EditableAvatar pulls in the Reanimated-driven crop dialog, which registers
// a real native Worklets module on import — unusable under Jest, and beside
// the point of this screen test (crop/pan interaction belongs in its own
// test for image-upload).
jest.mock('@/features/settings/components/EditableAvatar', () => ({
  EditableAvatar: () => null,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseLocalSettings = useLocalSettings as jest.Mock;
const mockRouterPush = router.push as jest.Mock;

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockUseAuth.mockReturnValue({
    logout: jest.fn(),
    hasAuthority: jest.fn().mockReturnValue(false),
    email: 'skater@example.com',
    ...overrides,
  });
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth();
    mockUseProfile.mockReturnValue({
      profile: { username: 'skater8', displayName: 'Skater Eight' },
      isLoading: false,
      refresh: jest.fn(),
    });
    mockUseLocalSettings.mockReturnValue({ language: 'en' });
  });

  it('renders the account rows visible to every user, without the admin section', async () => {
    await render(<SettingsScreen />);

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Your account')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('Data & storage')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('Log out')).toBeTruthy();
    expect(screen.queryByText('Administration')).toBeNull();
  });

  it('shows the admin section only when the user holds an admin authority', async () => {
    mockAuth({ hasAuthority: jest.fn((authority: string) => authority === 'FUNC_ABOUT_US_MANAGE') });
    await render(<SettingsScreen />);

    expect(screen.getByText('Administration')).toBeTruthy();
  });

  it('navigates to the account screen when the profile card is pressed', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen />);

    await user.press(screen.getByLabelText('Open your account'));

    expect(mockRouterPush).toHaveBeenCalledWith('/settings/account');
  });

  it('navigates to the notifications screen when that row is pressed', async () => {
    const user = userEvent.setup();
    await render(<SettingsScreen />);

    await user.press(screen.getByText('Notifications'));

    expect(mockRouterPush).toHaveBeenCalledWith('/settings/notifications');
  });

  it('confirms before logging out, and logs out when the destructive action is chosen', async () => {
    const logout = jest.fn();
    mockAuth({ logout });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<SettingsScreen />);

    await user.press(screen.getByText('Log out'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((button) => button.style === 'destructive');
    confirmButton?.onPress?.();

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
