import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import FeaturedPlayerScreen from '@/app/(tabs)/settings/featured-player';
import { useAuth } from '@/core/auth';
import { useFeaturedContentPicker } from '@/features/home/hooks/useFeaturedContentPicker';
import { useFeaturedPlayerAdmin } from '@/features/home/hooks/useFeaturedPlayerAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/home/hooks/useFeaturedPlayerAdmin', () => ({
  useFeaturedPlayerAdmin: jest.fn(),
}));

jest.mock('@/features/home/hooks/useFeaturedContentPicker', () => ({
  useFeaturedContentPicker: jest.fn(),
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseFeaturedPlayerAdmin = useFeaturedPlayerAdmin as jest.Mock;
const mockUseFeaturedContentPicker = useFeaturedContentPicker as jest.Mock;

const CONFIG = {
  enabled: false,
  contentId: null,
  position: 'BOTTOM',
  preferredPlatform: null,
  selectionMode: 'MANUAL',
};

const EPISODE = {
  id: 'ep1',
  title: 'Episode One',
  publishAt: '2026-01-01T00:00:00Z',
  platforms: [{ platform: 'SPOTIFY' }],
};

function admin(overrides: Partial<ReturnType<typeof useFeaturedPlayerAdmin>> = {}) {
  return {
    submitting: false,
    getConfig: jest.fn().mockResolvedValue(CONFIG),
    updateConfig: jest.fn(),
    ...overrides,
  };
}

function picker(overrides: Partial<ReturnType<typeof useFeaturedContentPicker>> = {}) {
  return {
    search: '',
    setSearch: jest.fn(),
    posts: [],
    isLoading: false,
    hasMore: false,
    loadMore: jest.fn(),
    ...overrides,
  };
}

describe('FeaturedPlayerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    mockUseFeaturedContentPicker.mockReturnValue(picker());
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseFeaturedPlayerAdmin.mockReturnValue(admin());

    await render(<FeaturedPlayerScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows an error banner when loading the config fails, with a retry', async () => {
    const refreshAdmin = admin({
      getConfig: jest
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(CONFIG),
    });
    mockUseFeaturedPlayerAdmin.mockReturnValue(refreshAdmin);
    const user = userEvent.setup();

    await render(<FeaturedPlayerScreen />);

    expect(await screen.findByText('Could not load the Featured Player configuration.')).toBeTruthy();

    await user.press(screen.getByText('Retry'));

    expect(await screen.findByText('Enable Featured Player')).toBeTruthy();
    expect(refreshAdmin.getConfig).toHaveBeenCalledTimes(2);
  });

  it('renders the disabled state with just the enable toggle', async () => {
    mockUseFeaturedPlayerAdmin.mockReturnValue(admin());

    await render(<FeaturedPlayerScreen />);

    expect(await screen.findByText('Enable Featured Player')).toBeTruthy();
    expect(screen.queryByText('Selection mode')).toBeNull();
  });

  it('enabling shows the manual episode picker by default and lets an episode be selected', async () => {
    mockUseFeaturedPlayerAdmin.mockReturnValue(admin());
    mockUseFeaturedContentPicker.mockReturnValue(picker({ posts: [EPISODE] }));
    const user = userEvent.setup();

    await render(<FeaturedPlayerScreen />);
    await screen.findByText('Enable Featured Player');

    await user.press(screen.getByText('Enable Featured Player'));

    expect(await screen.findByText('Episode One')).toBeTruthy();

    await user.press(screen.getByText('Episode One'));
    // Selecting resets any previously-chosen preferred platform; nothing else
    // to assert on directly since contentId/preferredPlatform are local state,
    // but the save payload below covers that it took effect.
  });

  it('switching to AUTO mode hides the episode picker and shows platform preference chips', async () => {
    mockUseFeaturedPlayerAdmin.mockReturnValue(admin());
    const user = userEvent.setup();

    await render(<FeaturedPlayerScreen />);
    await screen.findByText('Enable Featured Player');
    await user.press(screen.getByText('Enable Featured Player'));
    await screen.findByText('Selection mode');

    await user.press(screen.getByText('Automatic'));

    expect(screen.queryByPlaceholderText('Search episodes...')).toBeNull();
    expect(await screen.findByText('Auto (Spotify first)')).toBeTruthy();
  });

  it('filters posts as the search text changes', async () => {
    const setSearch = jest.fn();
    mockUseFeaturedPlayerAdmin.mockReturnValue(admin());
    mockUseFeaturedContentPicker.mockReturnValue(picker({ setSearch }));
    const user = userEvent.setup();

    await render(<FeaturedPlayerScreen />);
    await screen.findByText('Enable Featured Player');
    await user.press(screen.getByText('Enable Featured Player'));

    await user.type(screen.getByPlaceholderText('Search episodes...'), 'x');

    expect(setSearch).toHaveBeenCalled();
  });

  it('loads more episodes when the load-more button is pressed', async () => {
    const loadMore = jest.fn();
    mockUseFeaturedPlayerAdmin.mockReturnValue(admin());
    mockUseFeaturedContentPicker.mockReturnValue(picker({ posts: [EPISODE], hasMore: true, loadMore }));
    const user = userEvent.setup();

    await render(<FeaturedPlayerScreen />);
    await screen.findByText('Enable Featured Player');
    await user.press(screen.getByText('Enable Featured Player'));
    await screen.findByText('Episode One');

    await user.press(screen.getByText('Load more'));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('saves with the right payload and shows a confirmation alert', async () => {
    const updateConfig = jest.fn().mockResolvedValueOnce(undefined);
    mockUseFeaturedPlayerAdmin.mockReturnValue(admin({ updateConfig }));
    mockUseFeaturedContentPicker.mockReturnValue(picker({ posts: [EPISODE] }));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<FeaturedPlayerScreen />);
    await screen.findByText('Enable Featured Player');
    await user.press(screen.getByText('Enable Featured Player'));
    await screen.findByText('Episode One');
    await user.press(screen.getByText('Episode One'));

    await user.press(screen.getByText('Save'));

    expect(updateConfig).toHaveBeenCalledWith({
      enabled: true,
      contentSource: 'PODCAST',
      contentId: 'ep1',
      playerType: 'MINI',
      position: 'BOTTOM',
      preferredPlatform: null,
      selectionMode: 'MANUAL',
    });
    expect(alertSpy).toHaveBeenCalledWith('Saved', 'Home Featured Player updated.', undefined);
  });

  it('shows an error alert when saving fails', async () => {
    mockUseFeaturedPlayerAdmin.mockReturnValue(
      admin({ updateConfig: jest.fn().mockRejectedValueOnce(new Error('denied')) })
    );
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<FeaturedPlayerScreen />);
    await screen.findByText('Enable Featured Player');

    // MANUAL + enabled with no contentId keeps Save disabled, so switch to
    // AUTO first (which never requires a contentId) to exercise the failure path.
    await user.press(screen.getByText('Enable Featured Player'));
    await screen.findByText('Selection mode');
    await user.press(screen.getByText('Automatic'));

    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Could not save', 'Try again.', undefined);
  });
});
