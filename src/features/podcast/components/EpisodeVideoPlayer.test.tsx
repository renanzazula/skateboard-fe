import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

import { EpisodeVideoPlayer } from '@/features/podcast/components/EpisodeVideoPlayer';

jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: unknown) => <View testID="youtube-player" {...(props as object)} /> };
});

jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({})),
    VideoView: (props: unknown) => <View testID="video-view" {...(props as object)} />,
  };
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

describe('EpisodeVideoPlayer', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    setOS(originalOS);
  });

  it('renders nothing when there is no youtube id or video url', async () => {
    const { toJSON } = await render(<EpisodeVideoPlayer youtubeId={null} videoUrl={null} height={200} />);

    expect(toJSON()).toBeNull();
  });

  it('renders the native YouTube player when a youtube id is given', async () => {
    setOS('ios');
    const view = await render(<EpisodeVideoPlayer youtubeId="abc123" videoUrl={null} height={200} />);

    const player = findNode(view.toJSON(), (n) => n.props.testID === 'youtube-player')!;
    expect(player.props.videoId).toBe('abc123');
    expect(player.props.height).toBe(200);
  });

  it('renders a web iframe embed when a youtube id is given on web', async () => {
    setOS('web');
    const view = await render(<EpisodeVideoPlayer youtubeId="abc123" videoUrl={null} height={200} />);

    const iframe = findNode(view.toJSON(), (n) => n.type === 'iframe')!;
    expect(iframe.props.src).toBe('https://www.youtube.com/embed/abc123?playsinline=1&rel=0');
  });

  it('prefers the youtube id over a video url when both are given', async () => {
    setOS('ios');
    const view = await render(<EpisodeVideoPlayer youtubeId="abc123" videoUrl="https://x/video.mp4" height={200} />);

    expect(findNode(view.toJSON(), (n) => n.props.testID === 'video-view')).toBeNull();
    expect(findNode(view.toJSON(), (n) => n.props.testID === 'youtube-player')).toBeTruthy();
  });

  it('renders a native file video when only a video url is given', async () => {
    setOS('ios');
    const view = await render(<EpisodeVideoPlayer youtubeId={null} videoUrl="https://x/video.mp4" height={200} />);

    expect(findNode(view.toJSON(), (n) => n.props.testID === 'video-view')).toBeTruthy();
  });

  it('renders a web <video> element with poster when only a video url is given on web', async () => {
    setOS('web');
    const view = await render(
      <EpisodeVideoPlayer youtubeId={null} videoUrl="https://x/video.mp4" poster="https://x/poster.jpg" height={200} />
    );

    const video = findNode(view.toJSON(), (n) => n.type === 'video')!;
    expect(video.props.src).toBe('https://x/video.mp4');
    expect(video.props.poster).toBe('https://x/poster.jpg');
  });
});
