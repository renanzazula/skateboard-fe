import { blockToEditor, defaultEditor, isValidUrl, toBlock } from '@/features/podcast/utils/blockEditor';
import type { Block } from '@/shared/types/posts';

describe('toBlock', () => {
  it('converts a text editor', () => {
    expect(toBlock({ type: 'text', html: '<p>x</p>' })).toEqual({ type: 'text', data: { html: '<p>x</p>' } });
  });

  it('converts an image editor, omitting an empty caption', () => {
    expect(toBlock({ type: 'image', url: 'https://x/y.png', caption: '' })).toEqual({
      type: 'image',
      data: { url: 'https://x/y.png', caption: undefined },
    });
  });

  it('returns null for an image with no url', () => {
    expect(toBlock({ type: 'image', url: '', caption: '' })).toBeNull();
  });

  it('converts a video editor', () => {
    expect(toBlock({ type: 'video', url: 'https://x/v.mp4' })).toEqual({ type: 'video', data: { url: 'https://x/v.mp4' } });
  });

  it('returns null for a video with no url', () => {
    expect(toBlock({ type: 'video', url: '' })).toBeNull();
  });

  it('converts a quote editor', () => {
    expect(toBlock({ type: 'quote', text: 'Hi', author: 'Me' })).toEqual({ type: 'quote', data: { text: 'Hi', author: 'Me' } });
  });

  it('returns null for a quote with no text', () => {
    expect(toBlock({ type: 'quote', text: '', author: '' })).toBeNull();
  });

  it('converts a youtube embed URL with a v= param', () => {
    expect(toBlock({ type: 'embed', rawUrl: 'https://www.youtube.com/watch?v=abc123&t=5' })).toEqual({
      type: 'embed',
      data: { platform: 'youtube', id: 'abc123' },
    });
  });

  it('converts a youtu.be embed URL', () => {
    expect(toBlock({ type: 'embed', rawUrl: 'https://youtu.be/abc123' })).toEqual({
      type: 'embed',
      data: { platform: 'youtube', id: 'abc123' },
    });
  });

  it('converts a vimeo embed URL', () => {
    expect(toBlock({ type: 'embed', rawUrl: 'https://vimeo.com/123456' })).toEqual({
      type: 'embed',
      data: { platform: 'vimeo', id: '123456' },
    });
  });

  it('returns null for an unrecognized embed URL', () => {
    expect(toBlock({ type: 'embed', rawUrl: 'https://example.com/video' })).toBeNull();
  });

  it('converts a gallery editor, filtering blank lines', () => {
    expect(toBlock({ type: 'gallery', urls: 'https://x/1.png\n\n https://x/2.png ' })).toEqual({
      type: 'gallery',
      data: { urls: ['https://x/1.png', 'https://x/2.png'] },
    });
  });

  it('returns null for an empty gallery', () => {
    expect(toBlock({ type: 'gallery', urls: '  \n  ' })).toBeNull();
  });

  it('converts a link editor', () => {
    expect(toBlock({ type: 'link', url: 'https://x', title: 'T', description: 'D' })).toEqual({
      type: 'link',
      data: { url: 'https://x', title: 'T', description: 'D' },
    });
  });

  it('returns null for a link with no url', () => {
    expect(toBlock({ type: 'link', url: '', title: '', description: '' })).toBeNull();
  });

  it('converts a spotify editor', () => {
    expect(toBlock({ type: 'spotify', url: 'https://open.spotify.com/track/abc' })).toEqual({
      type: 'spotify',
      data: { url: 'https://open.spotify.com/track/abc', spotifyType: 'track', spotifyId: 'abc' },
    });
  });

  it('returns null for an unparseable spotify url', () => {
    expect(toBlock({ type: 'spotify', url: 'https://example.com' })).toBeNull();
  });
});

describe('blockToEditor', () => {
  it('round-trips a text block', () => {
    const block: Block = { type: 'text', data: { html: '<p>x</p>' } };
    expect(blockToEditor(block)).toEqual({ type: 'text', html: '<p>x</p>' });
  });

  it('round-trips an image block, defaulting caption', () => {
    const block: Block = { type: 'image', data: { url: 'u' } };
    expect(blockToEditor(block)).toEqual({ type: 'image', url: 'u', caption: '' });
  });

  it('round-trips a youtube embed block to a watch URL', () => {
    const block: Block = { type: 'embed', data: { platform: 'youtube', id: 'abc' } };
    expect(blockToEditor(block)).toEqual({ type: 'embed', rawUrl: 'https://www.youtube.com/watch?v=abc' });
  });

  it('round-trips a vimeo embed block to a vimeo URL', () => {
    const block: Block = { type: 'embed', data: { platform: 'vimeo', id: '123' } };
    expect(blockToEditor(block)).toEqual({ type: 'embed', rawUrl: 'https://vimeo.com/123' });
  });

  it('round-trips a gallery block, joining urls with newlines', () => {
    const block: Block = { type: 'gallery', data: { urls: ['a', 'b'] } };
    expect(blockToEditor(block)).toEqual({ type: 'gallery', urls: 'a\nb' });
  });

  it('round-trips a link block, defaulting title/description', () => {
    const block: Block = { type: 'link', data: { url: 'u' } };
    expect(blockToEditor(block)).toEqual({ type: 'link', url: 'u', title: '', description: '' });
  });

  it('round-trips a spotify block', () => {
    const block: Block = { type: 'spotify', data: { url: 'u', spotifyType: 'track', spotifyId: 'abc' } };
    expect(blockToEditor(block)).toEqual({ type: 'spotify', url: 'u' });
  });
});

describe('defaultEditor', () => {
  it.each(['text', 'image', 'video', 'quote', 'embed', 'gallery', 'link', 'spotify'] as const)(
    'returns an empty %s editor',
    (type) => {
      expect(defaultEditor(type).type).toBe(type);
    }
  );
});

describe('isValidUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('rejects non-URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});
