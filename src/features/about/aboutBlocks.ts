import type { ContentBlock, ContentBlockType, SocialPlatform } from '@/shared/types/content-blocks';

/**
 * Block types an admin can add to the About Us page. A deliberate subset of the
 * full content-block union — video / embed / spotify are left out of v1 (see
 * .docs/ABOUT_US_README.md "Initial Scope").
 */
export const ABOUT_BLOCK_TYPES = [
  'hero',
  'text',
  'image',
  'gallery',
  'quote',
  'link',
  'social-links',
] as const satisfies readonly ContentBlockType[];

export type AboutBlockType = (typeof ABOUT_BLOCK_TYPES)[number];

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  'INSTAGRAM',
  'YOUTUBE',
  'TIKTOK',
  'X',
  'FACEBOOK',
  'SPOTIFY',
  'THREADS',
  'OTHER',
];

export function defaultBlock(type: AboutBlockType): ContentBlock {
  switch (type) {
    case 'hero':
      return { type: 'hero', data: { imageUrl: '', headline: '', subheadline: '' } };
    case 'text':
      return { type: 'text', data: { html: '' } };
    case 'image':
      return { type: 'image', data: { url: '', caption: '' } };
    case 'gallery':
      return { type: 'gallery', data: { urls: [] } };
    case 'quote':
      return { type: 'quote', data: { text: '', author: '' } };
    case 'link':
      return { type: 'link', data: { url: '', title: '', description: '' } };
    case 'social-links':
      return { type: 'social-links', data: { title: '', links: [] } };
  }
}

/** Immutably move `list[from]` to `to`, clamped. Used by the reorder arrows. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const HTTP_URL = /^https?:\/\/.+/i;

export function isValidUrl(url: string): boolean {
  return HTTP_URL.test(url.trim());
}

/**
 * Every URL an admin typed into a block, for validation before save. Covers the
 * fields that navigate somewhere or load a remote asset.
 */
export function collectBlockUrls(block: ContentBlock): string[] {
  switch (block.type) {
    case 'hero':
      return block.data.imageUrl ? [block.data.imageUrl] : [];
    case 'image':
      return block.data.url ? [block.data.url] : [];
    case 'gallery':
      return block.data.urls ?? [];
    case 'link':
      return block.data.url ? [block.data.url] : [];
    case 'social-links':
      return (block.data.links ?? []).map((l) => l.url).filter(Boolean);
    default:
      return [];
  }
}
