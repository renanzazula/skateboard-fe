import { router } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';

import AdministrationScreen from '@/app/(tabs)/settings/administration';
import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  router: { push: jest.fn() },
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockRouterPush = router.push as jest.Mock;

function mockAuth(authorities: string[]) {
  mockUseAuth.mockReturnValue({
    hasAuthority: jest.fn((authority: string) => authorities.includes(authority)),
  });
}

describe('AdministrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
  });

  it('redirects to settings when the user holds no admin authority', async () => {
    mockAuth([]);
    await render(<AdministrationScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows only the rows the user is authorized for', async () => {
    mockAuth(['FUNC_TAB_SETTINGS_BRANDING']);
    await render(<AdministrationScreen />);

    expect(screen.getByText('Branding')).toBeTruthy();
    expect(screen.queryByText('Home Video Categories')).toBeNull();
    expect(screen.queryByText('Featured Player')).toBeNull();
    expect(screen.queryByText('Podcast sync')).toBeNull();
    expect(screen.queryByText('About Us')).toBeNull();
    expect(screen.queryByText('Startup Campaigns')).toBeNull();
  });

  it('shows the campaigns row for a user who can manage campaigns', async () => {
    mockAuth(['FUNC_CAMPAIGN_MANAGE']);
    await render(<AdministrationScreen />);

    expect(screen.getByText('Startup Campaigns')).toBeTruthy();
  });

  it('shows the podcast row for a user who can only manage categories', async () => {
    mockAuth(['FUNC_PODCAST_MANAGE_CATEGORIES']);
    await render(<AdministrationScreen />);

    expect(screen.getByText('Podcast sync')).toBeTruthy();
  });

  it('navigates to each admin screen when every row is visible', async () => {
    mockAuth([
      'FUNC_TAB_SETTINGS_BRANDING',
      'FUNC_HOME_CATEGORY_CONFIG',
      'FUNC_HOME_FEATURED_PLAYER_CONFIG',
      'FUNC_PODCAST_IMPORT_JSON',
      'FUNC_ABOUT_US_MANAGE',
      'FUNC_CAMPAIGN_PUBLISH',
    ]);
    const user = userEvent.setup();
    await render(<AdministrationScreen />);

    await user.press(screen.getByText('Branding'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/branding');

    await user.press(screen.getByText('Home Video Categories'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/home-categories');

    await user.press(screen.getByText('Featured Player'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/featured-player');

    await user.press(screen.getByText('Podcast sync'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/podcast-admin');

    await user.press(screen.getByText('About Us'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/about-us-admin');

    await user.press(screen.getByText('Startup Campaigns'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/settings/campaigns');
  });
});
