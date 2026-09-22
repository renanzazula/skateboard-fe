import { useRouter } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';

import { triggerHomeReload } from '@/features/home/homeReloadRegistry';
import { useHomeFeaturedPlayer } from '@/features/home/hooks/useHomeFeaturedPlayer';
import { useHomeVideos } from '@/features/home/hooks/useHomeVideos';
import HomeScreen from '@/app/(tabs)/index';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('@/features/home/components/HomeHeader', () => {
  const { Text } = require('react-native');
  return { HomeHeader: () => <Text>home-header</Text> };
});

jest.mock('@/features/home/components/MiniPodcastPlayer', () => {
  const { Text } = require('react-native');
  return {
    MiniPodcastPlayer: ({ content }: { content: { title: string } }) => <Text>mini-player-{content.title}</Text>,
  };
});

jest.mock('@/features/home/components/HomeVideoGalleryItem', () => {
  const { Pressable, Text } = require('react-native');
  return {
    TILE_INSET: 3,
    HomeVideoGalleryItem: ({ video, onPress }: { video: { title: string }; onPress: (v: unknown) => void }) => (
      <Pressable onPress={() => onPress(video)} accessibilityRole="button" accessibilityLabel={video.title}>
        <Text>{video.title}</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/features/home/hooks/useHomeVideos', () => ({
  useHomeVideos: jest.fn(),
}));

jest.mock('@/features/home/hooks/useHomeFeaturedPlayer', () => ({
  useHomeFeaturedPlayer: jest.fn(),
}));

const mockUseHomeVideos = useHomeVideos as jest.Mock;
const mockUseHomeFeaturedPlayer = useHomeFeaturedPlayer as jest.Mock;

const VIDEO = { id: 'v1', slug: 'big-air', title: 'Big Air', thumbnailUrl: 'https://x/thumb.jpg' };

function videosState(overrides: Partial<ReturnType<typeof useHomeVideos>> = {}) {
  return {
    videos: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    reloadHome: jest.fn(),
    ...overrides,
  };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHomeFeaturedPlayer.mockReturnValue({ content: null });
    mockUseHomeVideos.mockReturnValue(videosState());
  });

  it('renders the header and gallery videos', async () => {
    mockUseHomeVideos.mockReturnValue(videosState({ videos: [VIDEO] }));
    await render(<HomeScreen />);

    expect(screen.getByText('home-header')).toBeTruthy();
    expect(screen.getByLabelText('Big Air')).toBeTruthy();
  });

  it('shows a loading indicator on first load', async () => {
    mockUseHomeVideos.mockReturnValue(videosState({ isLoading: true, videos: [] }));
    await render(<HomeScreen />);

    expect(screen.queryByLabelText('Big Air')).toBeNull();
  });

  it('shows an empty state with a refresh action', async () => {
    const refresh = jest.fn();
    mockUseHomeVideos.mockReturnValue(videosState({ refresh }));
    const user = userEvent.setup();
    await render(<HomeScreen />);

    expect(screen.getByText('No videos available yet.')).toBeTruthy();
    await user.press(screen.getByText('Refresh'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows an error banner with retry', async () => {
    const refresh = jest.fn();
    mockUseHomeVideos.mockReturnValue(videosState({ error: new Error('offline'), refresh }));
    const user = userEvent.setup();
    await render(<HomeScreen />);

    expect(screen.getByText('We couldn’t load the videos.')).toBeTruthy();

    await user.press(screen.getByText('Retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('navigates to the video detail route on press', async () => {
    mockUseHomeVideos.mockReturnValue(videosState({ videos: [VIDEO] }));
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const user = userEvent.setup();
    await render(<HomeScreen />);

    await user.press(screen.getByLabelText('Big Air'));

    expect(push).toHaveBeenCalledWith({ pathname: '/video/[slug]', params: { slug: 'big-air' } });
  });

  it('shows the featured player at the top when positioned TOP', async () => {
    mockUseHomeFeaturedPlayer.mockReturnValue({ content: { title: 'Featured Ep', position: 'TOP' } });
    await render(<HomeScreen />);

    expect(screen.getByText('mini-player-Featured Ep')).toBeTruthy();
  });

  it('shows the featured player at the bottom when positioned BOTTOM', async () => {
    mockUseHomeFeaturedPlayer.mockReturnValue({ content: { title: 'Featured Ep', position: 'BOTTOM' } });
    await render(<HomeScreen />);

    expect(screen.getByText('mini-player-Featured Ep')).toBeTruthy();
  });

  it('reloads the gallery when the Home tab is reselected', async () => {
    const reloadHome = jest.fn();
    mockUseHomeVideos.mockReturnValue(videosState({ reloadHome }));
    await render(<HomeScreen />);

    triggerHomeReload();

    expect(reloadHome).toHaveBeenCalledTimes(1);
  });
});
