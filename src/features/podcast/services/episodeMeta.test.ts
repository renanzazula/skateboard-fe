import {
  extractYoutubeIdFromUrl,
  getConsumedBlocks,
  getDescription,
  getDuration,
  getEpisodeNumber,
  getInstagramUrl,
  getSocialLinks,
  getSpotifyEmbedUrl,
  getYoutubeId,
  textBlockContent,
  youtubeThumbnail,
} from '@/features/podcast/services/episodeMeta';
import type { Post } from '@/shared/types/posts';

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: '1',
    slug: 'ep-1',
    title: 'Episode',
    status: 'published',
    publishAt: null,
    coverUrl: '',
    blocks: [],
    createdAt: '',
    updatedAt: '',
    createdBy: '',
    ...overrides,
  };
}

describe('getYoutubeId', () => {
  it('prefers the structured youtubeVideoId field', () => {
    expect(getYoutubeId(makePost({ youtubeVideoId: 'abc12345678' }))).toBe('abc12345678');
  });

  it('falls back to parsing youtubeUrl', () => {
    expect(getYoutubeId(makePost({ youtubeUrl: 'https://youtu.be/abc12345678' }))).toBe('abc12345678');
  });

  it('falls back to an embed block', () => {
    const post = makePost({ blocks: [{ type: 'embed', data: { platform: 'youtube', id: 'blockid1234' } }] });
    expect(getYoutubeId(post)).toBe('blockid1234');
  });

  it('falls back to a video block URL', () => {
    const post = makePost({ blocks: [{ type: 'video', data: { url: 'https://youtu.be/vidid123456' } }] });
    expect(getYoutubeId(post)).toBe('vidid123456');
  });

  it('returns null when nothing matches', () => {
    expect(getYoutubeId(makePost())).toBeNull();
  });
});

describe('extractYoutubeIdFromUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abc12345678', 'abc12345678'],
    ['https://youtu.be/abc12345678', 'abc12345678'],
    ['https://www.youtube.com/embed/abc12345678', 'abc12345678'],
  ])('extracts from %s', (url, id) => {
    expect(extractYoutubeIdFromUrl(url)).toBe(id);
  });

  it('returns null for a non-matching URL', () => {
    expect(extractYoutubeIdFromUrl('https://example.com')).toBeNull();
  });
});

describe('youtubeThumbnail', () => {
  it('builds the thumbnail URL', () => {
    expect(youtubeThumbnail('abc', 'hqdefault')).toBe('https://img.youtube.com/vi/abc/hqdefault.jpg');
  });
});

describe('getEpisodeNumber', () => {
  it('prefers the structured field', () => {
    expect(getEpisodeNumber(makePost({ episodeNumber: 42 }))).toBe(42);
  });

  it('parses a trailing # from the title', () => {
    expect(getEpisodeNumber(makePost({ title: 'Skateboard Podcast #87' }))).toBe(87);
  });

  it('parses a # with a space before the digits', () => {
    expect(getEpisodeNumber(makePost({ title: 'Skateboard Podcast # 77' }))).toBe(77);
  });

  it('returns null when no number is present', () => {
    expect(getEpisodeNumber(makePost({ title: 'No number here' }))).toBeNull();
  });
});

describe('getSpotifyEmbedUrl', () => {
  it('prefers the platforms field', () => {
    const post = makePost({ platforms: [{ platform: 'SPOTIFY', externalUrl: 'https://open.spotify.com/episode/xyz' }] });
    expect(getSpotifyEmbedUrl(post)).toBe('https://open.spotify.com/embed/episode/xyz');
  });

  it('falls back to a spotify block', () => {
    const post = makePost({ blocks: [{ type: 'spotify', data: { url: '', spotifyType: 'track', spotifyId: 'abc' } }] });
    expect(getSpotifyEmbedUrl(post)).toBe('https://open.spotify.com/embed/track/abc');
  });

  it('returns null when there is no Spotify info', () => {
    expect(getSpotifyEmbedUrl(makePost())).toBeNull();
  });
});

describe('getInstagramUrl', () => {
  it('finds an instagram.com link', () => {
    const post = makePost({ socialMediaLinks: [{ url: 'https://instagram.com/skateshop' }] });
    expect(getInstagramUrl(post)).toBe('https://instagram.com/skateshop');
  });

  it('returns null when there is none', () => {
    expect(getInstagramUrl(makePost({ socialMediaLinks: [{ url: 'https://x.com/skateshop' }] }))).toBeNull();
  });
});

describe('getSocialLinks', () => {
  it('labels a profile link with its @handle', () => {
    const post = makePost({ socialMediaLinks: [{ url: 'https://instagram.com/skateshop' }] });
    expect(getSocialLinks(post)).toEqual([{ url: 'https://instagram.com/skateshop', label: '@skateshop', isInstagram: true }]);
  });

  it('falls back to the platform label for a route-shaped link', () => {
    const post = makePost({ socialMediaLinks: [{ url: 'https://youtube.com/watch?v=abc' }] });
    expect(getSocialLinks(post)).toEqual([{ url: 'https://youtube.com/watch?v=abc', label: 'YouTube', isInstagram: false }]);
  });

  it('falls back to the stored platform, then the domain', () => {
    const post = makePost({ socialMediaLinks: [{ url: 'https://unknownhost.example', platform: 'Custom' }] });
    expect(getSocialLinks(post)[0].label).toBe('Custom');
  });

  it('skips links with no url', () => {
    expect(getSocialLinks(makePost({ socialMediaLinks: [{ url: '  ' }] }))).toEqual([]);
  });
});

describe('textBlockContent', () => {
  it('strips HTML tags', () => {
    expect(textBlockContent('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('strips a trailing date/duration metadata line', () => {
    expect(textBlockContent('Some text\nJan 1, 2024 · 12:34')).toBe('Some text');
  });
});

describe('getDuration', () => {
  it('formats seconds as mm:ss', () => {
    expect(getDuration(makePost({ durationSeconds: 95 }))).toBe('1:35');
  });

  it('formats seconds as h:mm:ss when over an hour', () => {
    expect(getDuration(makePost({ durationSeconds: 3661 }))).toBe('1:01:01');
  });

  it('parses a duration out of a text block when no field is set', () => {
    const post = makePost({ blocks: [{ type: 'text', data: { html: '<p>Jan 1 · 5:30</p>' } }] });
    expect(getDuration(post)).toBe('5:30');
  });

  it('returns null when nothing is available', () => {
    expect(getDuration(makePost())).toBeNull();
  });
});

describe('getDescription', () => {
  it('prefers the structured field', () => {
    expect(getDescription(makePost({ description: 'Explicit' }))).toBe('Explicit');
  });

  it('joins text blocks when no field is set', () => {
    const post = makePost({
      blocks: [
        { type: 'text', data: { html: '<p>First</p>' } },
        { type: 'text', data: { html: '<p>Second</p>' } },
      ],
    });
    expect(getDescription(post)).toBe('First\n\nSecond');
  });
});

describe('getConsumedBlocks', () => {
  it('consumes the hero youtube embed block when no structured field is set', () => {
    const heroBlock = { type: 'embed', data: { platform: 'youtube', id: 'abc' } } as const;
    const post = makePost({ blocks: [heroBlock] });
    expect(getConsumedBlocks(post).has(heroBlock)).toBe(true);
  });

  it('does not consume blocks when structured fields already cover them', () => {
    const heroBlock = { type: 'embed', data: { platform: 'youtube', id: 'abc' } } as const;
    const post = makePost({ youtubeVideoId: 'already-set', blocks: [heroBlock] });
    expect(getConsumedBlocks(post).has(heroBlock)).toBe(false);
  });

  it('consumes a text block whose content matches the description', () => {
    const textBlock = { type: 'text', data: { html: '<p>Same text</p>' } } as const;
    const post = makePost({ description: 'Same text', blocks: [textBlock] });
    expect(getConsumedBlocks(post).has(textBlock)).toBe(true);
  });
});
