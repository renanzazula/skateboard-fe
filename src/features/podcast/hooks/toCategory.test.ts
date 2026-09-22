import { toCategory } from '@/features/podcast/hooks/toCategory';

describe('toCategory', () => {
  it('maps a full response', () => {
    expect(
      toCategory({ id: '1', slug: 'news', name: 'News', coverUrl: 'https://x/y.png', default: true, postCount: 5 })
    ).toEqual({ id: '1', slug: 'news', name: 'News', coverUrl: 'https://x/y.png', isDefault: true, postCount: 5 });
  });

  it('falls back to defaults for missing fields', () => {
    expect(toCategory({})).toEqual({ id: '', slug: '', name: '', coverUrl: null, isDefault: false, postCount: 0 });
  });
});
