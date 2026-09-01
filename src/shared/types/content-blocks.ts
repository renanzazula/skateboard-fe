// The typed content-block model shared by the Podcast post editor and the
// About Us page. The podcast `Block` union (shared/types/posts.ts) is the
// original; About Us reuses it and adds two page-level block types plus an
// optional `hidden` flag so an admin can keep a section without showing it.
//
// Both the BFF's PostResponse.blocks and AboutPageResponse.blocks are typed as
// an opaque `{[key: string]: unknown}[]` in the OpenAPI spec — this is the
// concrete shape that array holds at runtime.

import type {
  Block,
  EmbedBlock,
  GalleryBlock,
  ImageBlock,
  LinkBlock,
  QuoteBlock,
  SpotifyBlock,
  TextBlock,
  VideoBlock,
} from '@/shared/types/posts';

export type {
  Block,
  EmbedBlock,
  GalleryBlock,
  ImageBlock,
  LinkBlock,
  QuoteBlock,
  SpotifyBlock,
  TextBlock,
  VideoBlock,
};

export type SocialPlatform =
  | 'INSTAGRAM'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'X'
  | 'FACEBOOK'
  | 'SPOTIFY'
  | 'THREADS'
  | 'OTHER';

/**
 * One social account on a `social-links` block. `username` is what the page
 * shows (e.g. "@skateshop"); `url` is where the chip navigates. The admin
 * configures both — see .docs/ABOUT_US_README.md "Social Links".
 */
export type SocialLinkItem = {
  platform: SocialPlatform;
  username: string;
  url: string;
};

export type HeroBlock = {
  type: 'hero';
  data: { imageUrl: string; headline?: string; subheadline?: string };
};

export type SocialLinksBlock = {
  type: 'social-links';
  data: { title?: string; links: SocialLinkItem[] };
};

/**
 * A block on the About Us page: any podcast block, plus `hero` / `social-links`,
 * each optionally `hidden`. `(A | B) & C` distributes, so every member keeps its
 * `type` discriminant.
 */
export type ContentBlock = (Block | HeroBlock | SocialLinksBlock) & { hidden?: boolean };

export type ContentBlockType = ContentBlock['type'];
