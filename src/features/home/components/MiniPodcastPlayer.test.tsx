import { Platform } from 'react-native';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { MiniPodcastPlayer } from '@/features/home/components/MiniPodcastPlayer';
import type { FeaturedPlayerContent } from '@/features/home/hooks/useHomeFeaturedPlayer';

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: unknown) => <View testID="rn-webview" {...(props as object)} /> };
});

jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: unknown) => <View testID="youtube-player" {...(props as object)} /> };
});

type JsonNode = { type: string; props: Record<string, any>; children: JsonNode[] | string[] | null };
function findNode(node: JsonNode | JsonNode[] | string | null, predicate: (n: JsonNode) => boolean): JsonNode | null {
  if (!node) return null;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (typeof n === 'string') continue;
    if (predicate(n)) return n;
    const found = findNode(n.children as JsonNode[] | null, predicate);
    if (found) return found;
  }
  return null;
}

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function layout(view: ReturnType<typeof render>, width: number) {
  const root = findNode(view.toJSON(), (n) => typeof n.props.onLayout === 'function')!;
  fireEvent(root, 'layout', { nativeEvent: { layout: { width, height: 60, x: 0, y: 0 } } });
}

const SPOTIFY_CONTENT: FeaturedPlayerContent = {
  title: 'Big Air Session',
  subtitle: 'Skateboard Podcast #87',
  thumbnailUrl: 'https://x/thumb.jpg',
  playback: { type: 'SPOTIFY_EMBED', reference: 'https://open.spotify.com/episode/abc123' },
};

const YOUTUBE_CONTENT: FeaturedPlayerContent = {
  title: 'Big Air Session',
  playback: { type: 'YOUTUBE', reference: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
};

describe('MiniPodcastPlayer', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    setOS('ios');
  });

  afterEach(() => {
    setOS(originalOS);
  });

  it('renders the collapsed bar with title, subtitle, and thumbnail', async () => {
    await render(<MiniPodcastPlayer content={SPOTIFY_CONTENT} />);

    expect(screen.getByText('Big Air Session')).toBeTruthy();
    expect(screen.getByText('Skateboard Podcast #87')).toBeTruthy();
    expect(screen.getByLabelText('Expand featured player')).toBeTruthy();
  });

  it('shows a music icon placeholder when there is no thumbnail', async () => {
    const { thumbnailUrl, ...rest } = SPOTIFY_CONTENT;
    const view = await render(<MiniPodcastPlayer content={{ ...rest, thumbnailUrl: null }} />);

    expect(findNode(view.toJSON(), (n) => n.props.testID === 'youtube-player')).toBeNull();
  });

  it('expands to show the Spotify WebView embed on native', async () => {
    const user = userEvent.setup();
    const view = await render(<MiniPodcastPlayer content={SPOTIFY_CONTENT} />);
    layout(view, 300);

    await user.press(screen.getByLabelText('Expand featured player'));

    expect(screen.getByLabelText('Collapse featured player')).toBeTruthy();
    const webview = findNode(view.toJSON(), (n) => n.props.testID === 'rn-webview')!;
    expect(webview.props.source.uri).toBe('https://open.spotify.com/embed/episode/abc123');
  });

  it('expands to show the native YouTube player', async () => {
    const user = userEvent.setup();
    const view = await render(<MiniPodcastPlayer content={YOUTUBE_CONTENT} />);
    layout(view, 300);

    await user.press(screen.getByLabelText('Expand featured player'));

    const player = findNode(view.toJSON(), (n) => n.props.testID === 'youtube-player')!;
    expect(player.props.videoId).toBe('dQw4w9WgXcQ');
  });

  it('renders a web iframe when expanded on web', async () => {
    setOS('web');
    const user = userEvent.setup();
    const view = await render(<MiniPodcastPlayer content={SPOTIFY_CONTENT} />);
    layout(view, 300);

    await user.press(screen.getByLabelText('Expand featured player'));

    const iframe = findNode(view.toJSON(), (n) => n.type === 'iframe')!;
    expect(iframe.props.src).toBe('https://open.spotify.com/embed/episode/abc123');
  });

  it('collapses again on a second press', async () => {
    const user = userEvent.setup();
    const view = await render(<MiniPodcastPlayer content={SPOTIFY_CONTENT} />);
    layout(view, 300);

    await user.press(screen.getByLabelText('Expand featured player'));
    await user.press(screen.getByLabelText('Collapse featured player'));

    expect(findNode(view.toJSON(), (n) => n.props.testID === 'rn-webview')).toBeNull();
  });

  it('shows nothing extra when expanded but the playback reference cannot be resolved', async () => {
    const user = userEvent.setup();
    const view = await render(
      <MiniPodcastPlayer content={{ title: 'X', playback: { type: 'YOUTUBE', reference: 'not-a-youtube-url' } }} />
    );
    layout(view, 300);

    await user.press(screen.getByLabelText('Expand featured player'));

    expect(findNode(view.toJSON(), (n) => n.props.testID === 'youtube-player')).toBeNull();
  });

  it('shows nothing extra when there is no playback info at all', async () => {
    const user = userEvent.setup();
    const view = await render(<MiniPodcastPlayer content={{ title: 'X' }} />);
    layout(view, 300);

    await user.press(screen.getByLabelText('Expand featured player'));

    expect(findNode(view.toJSON(), (n) => n.props.testID === 'youtube-player')).toBeNull();
    expect(findNode(view.toJSON(), (n) => n.props.testID === 'rn-webview')).toBeNull();
  });
});
