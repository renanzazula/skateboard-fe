import { router } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { HomeHeader } from '@/features/home/components/HomeHeader';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/core/config', () => ({
  useAppConfig: jest.fn(() => ({ appLogoUrl: null })),
}));

const mockUseProfile = useProfile as jest.Mock;

describe('HomeHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the username when available', async () => {
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8', displayName: 'Sk8er' } });
    await render(<HomeHeader />);

    expect(screen.getByText('@skater8')).toBeTruthy();
  });

  it('falls back to the display name when there is no username', async () => {
    mockUseProfile.mockReturnValue({ profile: { username: null, displayName: 'Sk8er' } });
    await render(<HomeHeader />);

    expect(screen.getByText('Sk8er')).toBeTruthy();
  });

  it('falls back to a generic label when there is no profile at all', async () => {
    mockUseProfile.mockReturnValue({ profile: null });
    await render(<HomeHeader />);

    expect(screen.getByText('Skater')).toBeTruthy();
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
