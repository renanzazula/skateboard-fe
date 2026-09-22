import { router } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppHeader } from '@/shared/components/AppHeader';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const mockCanGoBack = router.canGoBack as jest.Mock;
const mockBack = router.back as jest.Mock;
const mockReplace = router.replace as jest.Mock;

describe('AppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a title and subtitle when given', async () => {
    await render(<AppHeader title="Settings" subtitle="Manage your account" />);

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Manage your account')).toBeTruthy();
  });

  it('renders children instead of the title stack when given', async () => {
    await render(
      <AppHeader title="Ignored">
        <Text>Custom row</Text>
      </AppHeader>
    );

    expect(screen.queryByText('Ignored')).toBeNull();
    expect(screen.getByText('Custom row')).toBeTruthy();
  });

  it('omits the back button by default', async () => {
    await render(<AppHeader title="Settings" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('goes back when a back arrow is pressed and there is history', async () => {
    mockCanGoBack.mockReturnValue(true);
    const user = userEvent.setup();
    await render(<AppHeader title="Settings" showBack />);

    await user.press(screen.getByRole('button'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('replaces to home when a back arrow is pressed with no history', async () => {
    mockCanGoBack.mockReturnValue(false);
    const user = userEvent.setup();
    await render(<AppHeader title="Settings" showBack />);

    await user.press(screen.getByRole('button'));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
