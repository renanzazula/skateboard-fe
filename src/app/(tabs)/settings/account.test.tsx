import { router } from 'expo-router';
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import AccountScreen from '@/app/(tabs)/settings/account';
import { useAuth } from '@/core/auth';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/account/hooks/useAccountActions', () => ({
  useAccountActions: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseAccountActions = useAccountActions as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockRouterPush = router.push as jest.Mock;

describe('AccountScreen', () => {
  const logout = jest.fn();
  const deactivateAccount = jest.fn();
  const deleteAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ logout, email: 'skater@example.com' });
    mockUseAccountActions.mockReturnValue({ deactivateAccount, deleteAccount, submitting: false });
    mockUseProfile.mockReturnValue({
      profile: {
        username: 'skater8',
        displayName: 'Skater Eight',
        createdAt: '2023-05-15T00:00:00Z',
        status: undefined,
      },
      isLoading: false,
    });
  });

  it('renders profile rows, email, and member since', async () => {
    await render(<AccountScreen />);

    expect(screen.getAllByText('@skater8').length).toBeGreaterThan(0);
    expect(screen.getByText('Skater Eight')).toBeTruthy();
    expect(screen.getByText('skater@example.com')).toBeTruthy();
    expect(screen.getByText('May 2023')).toBeTruthy();
    expect(screen.queryByText('Deactivated')).toBeNull();
  });

  it('shows the deactivated status row when the account is deactivated', async () => {
    mockUseProfile.mockReturnValue({
      profile: { username: 'skater8', status: 'DEACTIVATED' },
      isLoading: false,
    });
    await render(<AccountScreen />);

    expect(screen.getByText('Deactivated')).toBeTruthy();
  });

  it('navigates to username, display name and change password screens', async () => {
    const user = userEvent.setup();
    await render(<AccountScreen />);

    await user.press(screen.getByText('Username'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/username');

    await user.press(screen.getByText('Display name'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/display-name');

    await user.press(screen.getByText('Change password'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/change-password');
  });

  it('confirms before deactivating, and logs out on success', async () => {
    deactivateAccount.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<AccountScreen />);

    await user.press(screen.getByText('Deactivate account'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(deactivateAccount).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('shows an error alert when deactivation fails', async () => {
    deactivateAccount.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<AccountScreen />);

    await user.press(screen.getByText('Deactivate account'));
    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(logout).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenLastCalledWith('Could not deactivate account', 'Try again.', undefined);
  });

  it('deletes the account via the type-to-confirm dialog, then logs out', async () => {
    deleteAccount.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<AccountScreen />);

    await user.press(screen.getByText('Delete account'));
    await user.type(screen.getByPlaceholderText('skater8'), 'skater8');
    await user.press(screen.getByText('Delete my account'));

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('shows an error alert when deletion fails and keeps the user logged in', async () => {
    deleteAccount.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<AccountScreen />);

    await user.press(screen.getByText('Delete account'));
    await user.type(screen.getByPlaceholderText('skater8'), 'skater8');
    await user.press(screen.getByText('Delete my account'));

    expect(logout).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Could not delete account', 'Try again.', undefined);
  });
});
