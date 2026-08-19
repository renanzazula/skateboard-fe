// Rich content-block post model, ported from rork-standard-app/expo's
// shared/types/posts.ts. podcast-be's PostResponse.blocks is deliberately
// typed as an opaque `{[key: string]: unknown}[]` in the OpenAPI spec (its
// own description says "Ordered array of typed content blocks") — this is
// the typed shape that opaque array actually holds at runtime.

export type PostStatus = 'draft' | 'scheduled' | 'published';

export type TextBlock = {
  type: 'text';
  data: { html: string };
};

export type ImageBlock = {
  type: 'image';
  data: { url: string; caption?: string; isUpload?: boolean };
};

export type VideoBlock = {
  type: 'video';
  data: { url: string; poster?: string };
};

export type QuoteBlock = {
  type: 'quote';
  data: { text: string; author?: string };
};

export type EmbedBlock = {
  type: 'embed';
  data: { platform: 'youtube' | 'vimeo'; id: string };
};

export type SpotifyBlock = {
  type: 'spotify';
  data: { url: string; spotifyType: 'track' | 'album' | 'playlist' | 'episode' | 'show'; spotifyId: string };
};

export type GalleryBlock = {
  type: 'gallery';
  data: { urls: string[]; isUpload?: boolean[] };
};

export type LinkBlock = {
  type: 'link';
  data: { url: string; title?: string; description?: string };
};

export type Block =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | QuoteBlock
  | EmbedBlock
  | SpotifyBlock
  | GalleryBlock
  | LinkBlock;

export type SocialMediaLink = {
  url: string;
  platform?: string;
};

export type PlatformLink = {
  platform: 'YOUTUBE' | 'SPOTIFY';
  externalUrl: string | null;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  publishAt: string | null;
  coverUrl: string;
  blocks: Block[];
  socialMediaLinks?: SocialMediaLink[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Set only for posts ingested by podcast-be's YouTube sync job — null on
  // manually-authored/imported posts (including ones predating the sync).
  // See services/episodeMeta.ts, which prefers these over parsing `blocks`.
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  description?: string | null;
  durationSeconds?: number | null;
  episodeNumber?: number | null;
  // Distribution-platform links attached by the YouTube/Spotify sync jobs
  // (see .docs/README_SPOTIFY_YOUTUBE_PODCAST_INTEGRATION.md) — the current
  // source of truth for a synced episode's Spotify link. Manually-authored
  // posts predating that integration instead carry a `spotify` content block;
  // episodeMeta.ts's getSpotifyEmbedUrl checks both.
  platforms?: PlatformLink[];
};
