import { render, screen, userEvent } from '@testing-library/react-native';

import PodcastListScreen from '@/app/(tabs)/podcast/index';
import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { useCategories } from '@/features/podcast/hooks/useCategories';
import { usePodcastFeed } from '@/features/podcast/hooks/usePodcastFeed';

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((cb: () => void) => cb()),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/useCategories', () => ({
  useCategories: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/usePodcastFeed', () => ({
  usePodcastFeed: jest.fn(),
}));

const { useRouter } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseCategories = useCategories as jest.Mock;
const mockUsePodcastFeed = usePodcastFeed as jest.Mock;

const POST = {
  id: 'p1',
  slug: 'big-air',
  title: 'Big Air Session',
  publishAt: '2026-01-15T00:00:00Z',
  createdAt: '2026-01-14T00:00:00Z',
  coverUrl: 'https://x/cover.jpg',
  blocks: [],
};

function categories(overrides: Partial<ReturnType<typeof useCategories>> = {}) {
  return { categories: [], defaultCategory: undefined, isLoading: false, error: null, refresh: jest.fn(), ...overrides };
}

function feed(overrides: Partial<ReturnType<typeof usePodcastFeed>> = {}) {
  return {
    posts: [],
    total: 0,
    isLoading: false,
    error: null,
    hasMore: false,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  };
}

describe('PodcastListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
    mockUseCategories.mockReturnValue(categories());
    mockUsePodcastFeed.mockReturnValue(feed());
  });

  it('refreshes categories and posts on focus', async () => {
    const refreshCategories = jest.fn();
    const refreshPosts = jest.fn();
    mockUseCategories.mockReturnValue(categories({ refresh: refreshCategories }));
    mockUsePodcastFeed.mockReturnValue(feed({ refresh: refreshPosts }));

    await render(<PodcastListScreen />);

    expect(refreshCategories).toHaveBeenCalledTimes(1);
    expect(refreshPosts).toHaveBeenCalledTimes(1);
  });

  it('shows an error banner with retry when the feed fails to load', async () => {
    const refresh = jest.fn();
    mockUsePodcastFeed.mockReturnValue(feed({ error: new Error('offline'), refresh }));
    const user = userEvent.setup();
    await render(<PodcastListScreen />);

    expect(screen.getByText('Could not load videos.')).toBeTruthy();

    await user.press(screen.getByText('Retry'));
    // refresh() is also called once already via useFocusEffect on mount.
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state with no create action when the user cannot create posts', async () => {
    await render(<PodcastListScreen />);

    expect(screen.getByText('No videos available in this category yet.')).toBeTruthy();
    expect(screen.queryByText('Add your first episode')).toBeNull();
  });

  it('shows a create action in the empty state and a FAB when authorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    const push = jest.fn();
    useRouter.mockReturnValue({ push });
    const user = userEvent.setup();
    await render(<PodcastListScreen />);

    await user.press(screen.getByText('Add your first episode'));
    expect(push).toHaveBeenCalledWith('/podcast/admin/new');

    push.mockClear();
    await user.press(screen.getByLabelText('Create new episode'));
    expect(push).toHaveBeenCalledWith('/podcast/admin/new');
  });

  it('lists posts and navigates to the detail screen on press', async () => {
    mockUsePodcastFeed.mockReturnValue(feed({ posts: [POST], total: 1 }));
    const push = jest.fn();
    useRouter.mockReturnValue({ push });
    const user = userEvent.setup();
    await render(<PodcastListScreen />);

    expect(screen.getByText('Big Air Session')).toBeTruthy();

    await user.press(screen.getByLabelText('Big Air Session, episode 1'));
    expect(push).toHaveBeenCalledWith('/podcast/big-air');
  });

  it('shows a load-more footer and loads the next page', async () => {
    const loadMore = jest.fn();
    mockUsePodcastFeed.mockReturnValue(feed({ posts: [POST], total: 5, hasMore: true, loadMore }));
    const user = userEvent.setup();
    await render(<PodcastListScreen />);

    expect(screen.getByText('Showing 1 of 5 episodes')).toBeTruthy();

    await user.press(screen.getByText('Load more'));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("shows an 'all loaded' footer once there is nothing more to load", async () => {
    mockUsePodcastFeed.mockReturnValue(feed({ posts: [POST], total: 1, hasMore: false }));
    await render(<PodcastListScreen />);

    expect(screen.getByText('All 1 episodes loaded')).toBeTruthy();
  });
});
