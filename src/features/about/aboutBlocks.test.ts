import { ABOUT_BLOCK_TYPES, collectBlockUrls, defaultBlock, isValidUrl, moveItem } from '@/features/about/aboutBlocks';
import type { ContentBlock } from '@/shared/types/content-blocks';

describe('defaultBlock', () => {
  it.each(ABOUT_BLOCK_TYPES)('returns a %s block with the right type', (type) => {
    expect(defaultBlock(type).type).toBe(type);
  });
});

describe('moveItem', () => {
  it('moves an item earlier in the list', () => {
    expect(moveItem([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3]);
  });

  it('moves an item later in the list', () => {
    expect(moveItem([1, 2, 3, 4], 0, 3)).toEqual([2, 3, 4, 1]);
  });

  it('returns the same list when from equals to', () => {
    const list = [1, 2, 3];
    expect(moveItem(list, 1, 1)).toBe(list);
  });

  it('returns the same list when the target index is out of bounds', () => {
    const list = [1, 2, 3];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 0, 3)).toBe(list);
  });
});

describe('isValidUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('rejects non-URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('collectBlockUrls', () => {
  it('collects a hero image URL', () => {
    const block: ContentBlock = { type: 'hero', data: { imageUrl: 'https://x/h.png' } };
    expect(collectBlockUrls(block)).toEqual(['https://x/h.png']);
  });

  it('returns an empty array for a hero with no image', () => {
    const block: ContentBlock = { type: 'hero', data: { imageUrl: '' } };
    expect(collectBlockUrls(block)).toEqual([]);
  });

  it('collects an image block URL', () => {
    const block: ContentBlock = { type: 'image', data: { url: 'https://x/i.png' } };
    expect(collectBlockUrls(block)).toEqual(['https://x/i.png']);
  });

  it('collects all gallery URLs', () => {
    const block: ContentBlock = { type: 'gallery', data: { urls: ['a', 'b'] } };
    expect(collectBlockUrls(block)).toEqual(['a', 'b']);
  });

  it('collects a link URL', () => {
    const block: ContentBlock = { type: 'link', data: { url: 'https://x' } };
    expect(collectBlockUrls(block)).toEqual(['https://x']);
  });

  it('collects social-links URLs, filtering blanks', () => {
    const block: ContentBlock = {
      type: 'social-links',
      data: { links: [{ platform: 'INSTAGRAM', username: 'a', url: 'https://ig' }, { platform: 'X', username: 'b', url: '' }] },
    };
    expect(collectBlockUrls(block)).toEqual(['https://ig']);
  });

  it('returns an empty array for block types with no URLs', () => {
    const block: ContentBlock = { type: 'text', data: { html: '<p>x</p>' } };
    expect(collectBlockUrls(block)).toEqual([]);
  });
});
