import { Linking } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { BlockRenderer } from '@/shared/components/content/BlockRenderer';
import type { ContentBlock } from '@/shared/types/content-blocks';

// This RNTL version's render result has no UNSAFE_getByProps/getByType, so a
// node reachable only by its props (the Image's onError, the embed
// container's onLayout) is found by walking the raw JSON tree instead.
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

function findAllNodes(node: JsonNode | JsonNode[] | string | null, predicate: (n: JsonNode) => boolean, acc: JsonNode[] = []): JsonNode[] {
  if (!node) return acc;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (typeof n === 'string') continue;
    if (predicate(n)) acc.push(n);
    findAllNodes(n.children as JsonNode[] | null, predicate, acc);
  }
  return acc;
}

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({})),
  VideoView: () => {
    const { View } = require('react-native');
    return <View testID="video-view" />;
  },
}));

jest.mock('react-native-webview', () => ({
  WebView: () => {
    const { View } = require('react-native');
    return <View testID="rn-webview" />;
  },
}));

jest.mock('react-native-youtube-iframe', () => ({
  __esModule: true,
  default: () => {
    const { View } = require('react-native');
    return <View testID="youtube-player" />;
  },
}));

describe('BlockRenderer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing for a hidden block', async () => {
    const block = { type: 'text', data: { html: '<p>hi</p>' }, hidden: true } as ContentBlock;
    const view = await render(<BlockRenderer block={block} />);

    expect(view.toJSON()).toBeNull();
  });

  it('renders nothing for an unrecognized/unhandled block type (e.g. social-links)', async () => {
    const block = { type: 'social-links', data: { links: [] } } as ContentBlock;
    const view = await render(<BlockRenderer block={block} />);

    expect(view.toJSON()).toBeNull();
  });

  it('strips HTML tags from a text block', async () => {
    const block: ContentBlock = { type: 'text', data: { html: '<p>Hello <b>world</b></p>' } };
    await render(<BlockRenderer block={block} />);

    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  describe('image block', () => {
    it('renders the caption when given', async () => {
      const block: ContentBlock = { type: 'image', data: { url: 'https://x/a.png', caption: 'A caption' } };
      await render(<BlockRenderer block={block} />);

      expect(screen.getByText('A caption')).toBeTruthy();
    });

    it('shows a fallback with the translated message when the image fails to load', async () => {
      const block: ContentBlock = { type: 'image', data: { url: 'https://x/broken.png' } };
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const view = await render(<BlockRenderer block={block} />);

      const image = findNode(view.toJSON(), (n) => n.props?.source?.uri === 'https://x/broken.png')!;
      await act(async () => {
        image.props.onError({ nativeEvent: { error: '404' } });
      });

      expect(await screen.findByText('Image could not be loaded')).toBeTruthy();
      warnSpy.mockRestore();
    });
  });

  describe('hero block', () => {
    it('renders headline and subheadline when given', async () => {
      const block: ContentBlock = {
        type: 'hero',
        data: { imageUrl: 'https://x/hero.png', headline: 'Big headline', subheadline: 'Sub' },
      };
      await render(<BlockRenderer block={block} />);

      expect(screen.getByText('Big headline')).toBeTruthy();
      expect(screen.getByText('Sub')).toBeTruthy();
    });

    it('renders nothing extra when there is no headline/subheadline/imageUrl', async () => {
      const block: ContentBlock = { type: 'hero', data: { imageUrl: '' } };
      const view = await render(<BlockRenderer block={block} />);

      expect(view.toJSON()).toBeTruthy();
    });
  });

  describe('video block (native)', () => {
    it('renders the native video player', async () => {
      const block: ContentBlock = { type: 'video', data: { url: 'https://x/video.mp4' } };
      await render(<BlockRenderer block={block} />);

      expect(screen.getByTestId('video-view')).toBeTruthy();
    });
  });

  describe('quote block', () => {
    it('renders the quote text and author when given', async () => {
      const block: ContentBlock = { type: 'quote', data: { text: 'Skate or die', author: 'Someone' } };
      await render(<BlockRenderer block={block} />);

      expect(screen.getByText('Skate or die')).toBeTruthy();
      expect(screen.getByText('— Someone')).toBeTruthy();
    });

    it('omits the author line when not given', async () => {
      const block: ContentBlock = { type: 'quote', data: { text: 'Skate or die' } };
      await render(<BlockRenderer block={block} />);

      expect(screen.queryByText(/^—/)).toBeNull();
    });
  });

  describe('embed block (native)', () => {
    it('renders the youtube player once a width is measured', async () => {
      const block: ContentBlock = { type: 'embed', data: { platform: 'youtube', id: 'abc123' } };
      const view = await render(<BlockRenderer block={block} />);

      const container = findNode(view.toJSON(), (n) => typeof n.props?.onLayout === 'function')!;
      await act(async () => {
        container.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
      });

      expect(await screen.findByTestId('youtube-player')).toBeTruthy();
    });

    it('renders the webview for a vimeo embed once a width is measured', async () => {
      const block: ContentBlock = { type: 'embed', data: { platform: 'vimeo', id: 'xyz' } };
      const view = await render(<BlockRenderer block={block} />);

      const container = findNode(view.toJSON(), (n) => typeof n.props?.onLayout === 'function')!;
      await act(async () => {
        container.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
      });

      expect(await screen.findByTestId('rn-webview')).toBeTruthy();
    });
  });

  describe('spotify block (native)', () => {
    it('renders a capitalized spotify link card and opens the URL on press', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
      const user = userEvent.setup();
      const block: ContentBlock = {
        type: 'spotify',
        data: { url: 'https://open.spotify.com/track/1', spotifyType: 'track', spotifyId: '1' },
      };
      await render(<BlockRenderer block={block} />);

      expect(screen.getByText('Track on Spotify')).toBeTruthy();
      await user.press(screen.getByText('Track on Spotify'));

      expect(openURLSpy).toHaveBeenCalledWith('https://open.spotify.com/track/1');
    });
  });

  describe('gallery block', () => {
    it('renders one image per url', async () => {
      const block: ContentBlock = { type: 'gallery', data: { urls: ['https://x/1.png', 'https://x/2.png'] } };
      const view = await render(<BlockRenderer block={block} />);

      const images = findAllNodes(view.toJSON(), (n) => n.props?.resizeMode === 'cover');
      expect(images.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('link block', () => {
    it('renders the title, url, and description when given, and opens the URL on press', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
      const user = userEvent.setup();
      const block: ContentBlock = {
        type: 'link',
        data: { url: 'https://x/page', title: 'A link', description: 'Some description' },
      };
      await render(<BlockRenderer block={block} />);

      expect(screen.getByText('A link')).toBeTruthy();
      expect(screen.getByText('https://x/page')).toBeTruthy();
      expect(screen.getByText('Some description')).toBeTruthy();

      await user.press(screen.getByText('A link'));
      expect(openURLSpy).toHaveBeenCalledWith('https://x/page');
    });

    it('does not attempt to open a blank url on press', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
      const user = userEvent.setup();
      const block: ContentBlock = { type: 'link', data: { url: '' } };
      await render(<BlockRenderer block={block} />);

      await user.press(screen.getByText(''));
      expect(openURLSpy).not.toHaveBeenCalled();
    });
  });
});
