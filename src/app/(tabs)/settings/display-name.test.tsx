import { router } from 'expo-router';
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import DisplayNameScreen from '@/app/(tabs)/settings/display-name';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

const mockUseProfile = useProfile as jest.Mock;
const mockRouterBack = router.back as jest.Mock;

describe('DisplayNameScreen', () => {
  const refresh = jest.fn();
  const updateDisplayName = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({
      profile: { displayName: 'Skater Eight' },
      refresh,
      updateDisplayName,
    });
  });

  it('pre-fills the current display name and disables Save until it changes', async () => {
    await render(<DisplayNameScreen />);

    const input = screen.getByDisplayValue('Skater Eight');
    expect(input).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState?.disabled).toBe(true);
  });

  it('saves the trimmed name, refreshes the profile, and navigates back', async () => {
    updateDisplayName.mockResolvedValueOnce(undefined);
    refresh.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<DisplayNameScreen />);

    const input = screen.getByDisplayValue('Skater Eight');
    await user.clear(input);
    await user.type(input, '  New Name  ');
    await user.press(screen.getByText('Save'));

    expect(updateDisplayName).toHaveBeenCalledWith('New Name');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error alert when saving fails', async () => {
    updateDisplayName.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<DisplayNameScreen />);

    const input = screen.getByDisplayValue('Skater Eight');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Could not save display name', 'Try again.', undefined);
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
