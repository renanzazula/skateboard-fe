import { router } from 'expo-router';
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import ChangePasswordScreen from '@/app/(tabs)/settings/change-password';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

jest.mock('@/features/account/hooks/useAccountActions', () => ({
  useAccountActions: jest.fn(),
}));

const mockUseAccountActions = useAccountActions as jest.Mock;
const mockRouterBack = router.back as jest.Mock;

describe('ChangePasswordScreen', () => {
  const changePassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountActions.mockReturnValue({ changePassword, submitting: false });
  });

  it('rejects a password shorter than 8 characters', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<ChangePasswordScreen />);

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'short');
    await user.type(screen.getByPlaceholderText('Re-enter your new password'), 'short');
    await user.press(screen.getByRole('button', { name: 'Change password' }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Password too short',
      'Your new password must be at least 8 characters.',
      undefined
    );
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<ChangePasswordScreen />);

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'password1');
    await user.type(screen.getByPlaceholderText('Re-enter your new password'), 'password2');
    await user.press(screen.getByRole('button', { name: 'Change password' }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Passwords do not match',
      'Re-enter your new password to confirm.',
      undefined
    );
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes the password and navigates back on confirmation', async () => {
    changePassword.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<ChangePasswordScreen />);

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'password1');
    await user.type(screen.getByPlaceholderText('Re-enter your new password'), 'password1');
    await user.press(screen.getByRole('button', { name: 'Change password' }));

    expect(changePassword).toHaveBeenCalledWith('password1');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, , buttons] = alertSpy.mock.calls[0];
    buttons?.[0]?.onPress?.();
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error alert when the change fails', async () => {
    changePassword.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<ChangePasswordScreen />);

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'password1');
    await user.type(screen.getByPlaceholderText('Re-enter your new password'), 'password1');
    await user.press(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('button', { name: 'Change password' })).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Could not change password', 'Try again.', undefined);
  });

  it('shows the submitting state with a busy, disabled button', async () => {
    mockUseAccountActions.mockReturnValue({ changePassword, submitting: true });
    await render(<ChangePasswordScreen />);

    const submitButton = screen.getAllByRole('button').find((b) => b.props.accessibilityState?.busy);
    expect(submitButton).toBeTruthy();
    expect(submitButton?.props.accessibilityState?.disabled).toBe(true);
  });
});
