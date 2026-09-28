import { router } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { HomeHeader } from '@/features/home/components/HomeHeader';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

// The bell has its own tests; here it only matters whether it is rendered.
jest.mock('@/features/notifications/inbox', () => {
  const { Text } = require('react-native');
  return { NotificationBell: () => <Text>bell</Text> };
});

jest.mock('@/core/config', () => ({
  useAppConfig: jest.fn(() => ({ appLogoUrl: null })),
}));

const mockUseProfile = useProfile as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

describe('HomeHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: (authority: string) => authority === 'FUNC_USER_SELF_READ' });
  });

  it('shows the notification bell instead of the username', async () => {
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8', displayName: 'Sk8er' } });
    await render(<HomeHeader />);

    expect(screen.getByText('bell')).toBeTruthy();
    expect(screen.queryByText('@skater8')).toBeNull();
  });

  it('hides the bell from a user who cannot read their inbox', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: () => false });
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8', displayName: 'Sk8er' } });
    await render(<HomeHeader />);

    expect(screen.queryByText('bell')).toBeNull();
  });

  it('falls back to generic initials when there is no profile at all', async () => {
    mockUseProfile.mockReturnValue({ profile: null });
    await render(<HomeHeader />);

    expect(screen.getByText('SK')).toBeTruthy();
  });

  it('shows initials from the display name when there is no profile picture', async () => {
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8', displayName: 'Tony Hawk' } });
    await render(<HomeHeader />);

    expect(screen.getByText('TH')).toBeTruthy();
  });

  it('shows a two-letter initial for a single-word name', async () => {
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8', displayName: 'Skater' } });
    await render(<HomeHeader />);

    expect(screen.getByText('SK')).toBeTruthy();
  });

  it('navigates to settings when the avatar is pressed', async () => {
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8', displayName: 'Sk8er' } });
    const user = userEvent.setup();
    await render(<HomeHeader />);

    await user.press(screen.getByLabelText('Open Settings'));

    expect(router.push).toHaveBeenCalledWith('/settings');
  });
});
