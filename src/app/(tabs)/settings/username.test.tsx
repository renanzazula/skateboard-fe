import { router } from 'expo-router';
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import UsernameScreen from '@/app/(tabs)/settings/username';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

jest.mock('@/features/account/hooks/useAccountActions', () => ({
  useAccountActions: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

const mockUseAccountActions = useAccountActions as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockRouterBack = router.back as jest.Mock;

describe('UsernameScreen', () => {
  const refresh = jest.fn();
  const changeUsername = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' }, refresh });
    mockUseAccountActions.mockReturnValue({ changeUsername, submitting: false });
  });

  it('disables Save until the username changes', async () => {
    await render(<UsernameScreen />);

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState?.disabled).toBe(true);
  });

  it('rejects a username shorter than 3 characters', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<UsernameScreen />);

    const input = screen.getByDisplayValue('skater8');
    await user.clear(input);
    await user.type(input, 'ab');
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Username too short', 'Usernames must be at least 3 characters.', undefined);
    expect(changeUsername).not.toHaveBeenCalled();
  });

  it('saves the trimmed username, refreshes, and navigates back', async () => {
    changeUsername.mockResolvedValueOnce(undefined);
    refresh.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<UsernameScreen />);

    const input = screen.getByDisplayValue('skater8');
    await user.clear(input);
    await user.type(input, '  newname  ');
    await user.press(screen.getByText('Save'));

    expect(changeUsername).toHaveBeenCalledWith('newname');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error alert when the change fails', async () => {
    changeUsername.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<UsernameScreen />);

    const input = screen.getByDisplayValue('skater8');
    await user.clear(input);
    await user.type(input, 'newname');
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Could not change username', 'Try again.', undefined);
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
