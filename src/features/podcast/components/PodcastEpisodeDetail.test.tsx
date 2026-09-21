import { Linking } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { PodcastEpisodeDetail } from '@/features/podcast/components/PodcastEpisodeDetail';
import type { Post } from '@/shared/types/posts';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: unknown) => <View testID="rn-webview" {...(props as object)} /> };
});

jest.mock('@/features/podcast/components/EpisodeVideoPlayer', () => {
  const { Text } = require('react-native');
  return {
    EpisodeVideoPlayer: ({ youtubeId, videoUrl }: { youtubeId: string | null; videoUrl: string | null }) => (
      <Text>video-player-{youtubeId ?? videoUrl}</Text>
    ),
  };
});

jest.mock('@/shared/components/content/BlockRenderer', () => {
  const { Text } = require('react-native');
  return {
    BlockRenderer: ({ block }: { block: { type: string } }) => <Text>block-{block.type}</Text>,
  };
});

const BASE_POST: Post = {
  id: 'p1',
  title: 'Big Air Session',
  publishAt: '2026-01-15T00:00:00Z',
  createdAt: '2026-01-14T00:00:00Z',
  coverUrl: 'https://x/cover.jpg',
  description: 'A short description.',
  blocks: [],
  durationSeconds: 754,
  youtubeVideoId: 'abc12345678',
} as unknown as Post;

function handlers() {
  return { onBack: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn() };
}

describe('PodcastEpisodeDetail', () => {
  it('renders the hero video, title, duration, and description', async () => {
    await render(
      <PodcastEpisodeDetail post={BASE_POST} episodeNumber={12} canEdit={false} canDelete={false} {...handlers()} />
    );

    expect(screen.getByText('video-player-abc12345678')).toBeTruthy();
    expect(screen.getByText('Big Air Session')).toBeTruthy();
    expect(screen.getByText('EP #12')).toBeTruthy();
    expect(screen.getByText('12:34')).toBeTruthy();
    expect(screen.getByText('A short description.')).toBeTruthy();
  });

  it('omits the episode badge and duration when neither is available', async () => {
    const post = { ...BASE_POST, durationSeconds: undefined };
    await render(<PodcastEpisodeDetail post={post} episodeNumber={null} canEdit={false} canDelete={false} {...handlers()} />);

    expect(screen.queryByText(/^EP #/)).toBeNull();
    expect(screen.queryByText('12:34')).toBeNull();
  });

  it('shows a placeholder when there is no video and no cover image', async () => {
    const post = { ...BASE_POST, youtubeVideoId: undefined, coverUrl: undefined, blocks: [] };
    await render(<PodcastEpisodeDetail post={post} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />);

    expect(screen.queryByText(/^video-player-/)).toBeNull();
  });

  it('falls back to a video block for the hero when there is no youtube id', async () => {
    const post = {
      ...BASE_POST,
      youtubeVideoId: undefined,
      blocks: [{ type: 'video', data: { url: 'https://x/video.mp4' } }],
    };
    await render(<PodcastEpisodeDetail post={post} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />);

    expect(screen.getByText('video-player-https://x/video.mp4')).toBeTruthy();
  });

  it('shows the Spotify embed when a platform link resolves to one', async () => {
    const post = { ...BASE_POST, platforms: [{ platform: 'SPOTIFY', externalUrl: 'https://open.spotify.com/episode/abc123' }] };
    await render(<PodcastEpisodeDetail post={post} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />);

    expect(screen.getByText('LISTEN ON SPOTIFY')).toBeTruthy();
    expect(screen.getByTestId('rn-webview').props.source.uri).toBe('https://open.spotify.com/embed/episode/abc123');
  });

  it('renders social links and opens one on press', async () => {
    const post = { ...BASE_POST, socialMediaLinks: [{ url: 'https://instagram.com/skateco' }] };
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    await render(<PodcastEpisodeDetail post={post} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />);

    await user.press(screen.getByLabelText('Open @skateco'));

    expect(openURLSpy).toHaveBeenCalledWith('https://instagram.com/skateco');
  });

  it('collapses a long description and expands it on press', async () => {
    const longText = 'A'.repeat(250);
    const post = { ...BASE_POST, description: longText };
    const user = userEvent.setup();
    await render(<PodcastEpisodeDetail post={post} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />);

    expect(screen.getByText('Show more')).toBeTruthy();
    expect(screen.getByText(`${longText.slice(0, 180)}…`)).toBeTruthy();

    await user.press(screen.getByText('Show more'));

    expect(screen.getByText(longText)).toBeTruthy();
    expect(screen.getByText('Show less')).toBeTruthy();
  });

  it('does not show a toggle for a short description', async () => {
    await render(
      <PodcastEpisodeDetail post={BASE_POST} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />
    );

    expect(screen.queryByText('Show more')).toBeNull();
  });

  it('renders extra content blocks not consumed by the hero/description', async () => {
    const post = { ...BASE_POST, blocks: [{ type: 'quote', data: { text: 'Rad!' } }] };
    await render(<PodcastEpisodeDetail post={post} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />);

    expect(screen.getByText('block-quote')).toBeTruthy();
  });

  it('shows edit and delete buttons only when authorized, and wires them up', async () => {
    const fns = handlers();
    const user = userEvent.setup();
    await render(<PodcastEpisodeDetail post={BASE_POST} episodeNumber={1} canEdit={true} canDelete={true} {...fns} />);

    await user.press(screen.getByLabelText('Edit episode'));
    expect(fns.onEdit).toHaveBeenCalledTimes(1);

    await user.press(screen.getByLabelText('Delete episode'));
    expect(fns.onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides edit and delete buttons when unauthorized', async () => {
    await render(
      <PodcastEpisodeDetail post={BASE_POST} episodeNumber={1} canEdit={false} canDelete={false} {...handlers()} />
    );

    expect(screen.queryByLabelText('Edit episode')).toBeNull();
    expect(screen.queryByLabelText('Delete episode')).toBeNull();
  });

  it('calls onBack when the back button is pressed', async () => {
    const fns = handlers();
    const user = userEvent.setup();
    await render(<PodcastEpisodeDetail post={BASE_POST} episodeNumber={1} canEdit={false} canDelete={false} {...fns} />);

    await user.press(screen.getByLabelText('Back'));

    expect(fns.onBack).toHaveBeenCalledTimes(1);
  });
});
