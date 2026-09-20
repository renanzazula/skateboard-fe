import { toPost } from '@/features/podcast/hooks/toPost';

describe('toPost', () => {
  it('maps a full response', () => {
    const post = toPost({
      id: '1',
      slug: 'ep-1',
      title: 'Episode 1',
      status: 'draft',
      publishAt: '2024-01-01',
      coverUrl: 'https://x/c.png',
      blocks: [{ type: 'text' }],
      socialMediaLinks: [{ url: 'https://instagram.com/x', platform: 'INSTAGRAM' }],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      createdBy: 'admin',
      youtubeVideoId: 'abc',
      youtubeUrl: 'https://youtu.be/abc',
      description: 'desc',
      durationSeconds: 120,
      episodeNumber: 5,
      platforms: [{ platform: 'YOUTUBE', externalUrl: 'https://youtu.be/abc' }, { platform: null, externalUrl: 'https://x' }],
    });

    expect(post.id).toBe('1');
    expect(post.status).toBe('draft');
    expect(post.blocks).toEqual([{ type: 'text' }]);
    expect(post.platforms).toEqual([{ platform: 'YOUTUBE', externalUrl: 'https://youtu.be/abc' }]);
  });

  it('falls back to defaults for missing fields', () => {
    const post = toPost({});
    expect(post.id).toBe('');
    expect(post.status).toBe('published');
    expect(post.blocks).toEqual([]);
    expect(post.coverUrl).toBe('');
    expect(post.platforms).toBeUndefined();
  });
});
