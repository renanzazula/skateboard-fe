import { toVideo } from '@/features/home/hooks/toVideo';

describe('toVideo', () => {
  it('maps a full response', () => {
    expect(
      toVideo({
        id: '1',
        slug: 'v1',
        title: 'Video',
        thumbnailUrl: 'https://x/t.png',
        thumbnailWidth: 100,
        thumbnailHeight: 50,
        youtubeVideoId: 'abc',
        category: 'news',
      })
    ).toEqual({
      id: '1',
      slug: 'v1',
      title: 'Video',
      thumbnailUrl: 'https://x/t.png',
      thumbnailWidth: 100,
      thumbnailHeight: 50,
      youtubeVideoId: 'abc',
      category: 'news',
    });
  });

  it('falls back to defaults for missing fields', () => {
    expect(toVideo({})).toEqual({
      id: '',
      slug: '',
      title: '',
      thumbnailUrl: null,
      thumbnailWidth: null,
      thumbnailHeight: null,
      youtubeVideoId: null,
      category: null,
    });
  });
});
