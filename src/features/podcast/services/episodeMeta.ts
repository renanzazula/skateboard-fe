import { extractSpotifyInfo } from '@/features/podcast/services/spotify';
import type { Post } from '@/shared/types/posts';

// Posts created by podcast-be's YouTube sync job (see
// .docs/README-youtube-data-api-sync.md) carry these as structured fields
// directly on the Post response — no parsing needed. Posts that predate the
// sync (manually authored/imported) leave them null, so every getter below
// falls back to the legacy block/title parsing for those.

export function getYoutubeId(post: Post): string | null {
  if (post.youtubeVideoId) return post.youtubeVideoId;
  if (post.youtubeUrl) {
    const id = extractYoutubeIdFromUrl(post.youtubeUrl);
    if (id) return id;
  }
  for (const block of post.blocks) {
    if (block.type === 'embed' && block.data.platform === 'youtube') return block.data.id;
    if (block.type === 'video' && block.data.url) {
      const id = extractYoutubeIdFromUrl(block.data.url);
      if (id) return id;
    }
  }
  return null;
}

export function extractYoutubeIdFromUrl(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export function youtubeThumbnail(id: string, quality: 'maxresdefault' | 'hqdefault'): string {
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

// Imported titles carry the show's own numbering ("… Skateboard Podcast #87");
// that is the authoritative episode id, not the post's position in the feed.
export function getEpisodeNumber(post: Post): number | null {
  if (post.episodeNumber != null) return post.episodeNumber;
  const match = post.title.match(/#(\d+)\s*$/) ?? post.title.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Prefers the platform link the sync jobs attach (see
// .docs/README_SPOTIFY_YOUTUBE_PODCAST_INTEGRATION.md) — the only source for
// synced episodes, which never carry a `spotify` content block. Falls back to
// the legacy block for manually-authored posts predating that integration.
export function getSpotifyEmbedUrl(post: Post): string | null {
  const link = post.platforms?.find((p) => p.platform === 'SPOTIFY')?.externalUrl;
  if (link) {
    const info = extractSpotifyInfo(link);
    if (info) return `https://open.spotify.com/embed/${info.spotifyType}/${info.spotifyId}`;
  }
  for (const block of post.blocks) {
    if (block.type === 'spotify') {
      return `https://open.spotify.com/embed/${block.data.spotifyType}/${block.data.spotifyId}`;
    }
  }
  return null;
}

export function getInstagramUrl(post: Post): string | null {
  return post.socialMediaLinks?.find((l) => l.url.includes('instagram.com'))?.url ?? null;
}

/** Hosts we can name on sight; anything else falls back to its domain. */
const SOCIAL_PLATFORMS: { pattern: RegExp; label: string }[] = [
  { pattern: /(^|\.)instagram\.com/i, label: 'Instagram' },
  { pattern: /(^|\.)(youtube\.com|youtu\.be)/i, label: 'YouTube' },
  { pattern: /(^|\.)tiktok\.com/i, label: 'TikTok' },
  { pattern: /(^|\.)(twitter\.com|x\.com)/i, label: 'X' },
  { pattern: /(^|\.)facebook\.com/i, label: 'Facebook' },
  { pattern: /(^|\.)spotify\.com/i, label: 'Spotify' },
  { pattern: /(^|\.)threads\.(net|com)/i, label: 'Threads' },
];

export type ResolvedSocialLink = {
  url: string;
  /** Display name — a known platform, the stored platform, or the domain. */
  label: string;
  isInstagram: boolean;
};

/**
 * Host of an absolute URL, minus `www.`. Not `new URL()`: React Native's is a
 * partial implementation and doesn't expose `.hostname` reliably.
 */
function hostOf(url: string): string | null {
  const match = /^[a-z]+:\/\/([^/?#]+)/i.exec(url.trim());
  if (!match) return null;
  return match[1].replace(/^[^@]*@/, '').split(':')[0].replace(/^www\./i, '') || null;
}

/**
 * Every social link on the post, each with something to label it by.
 *
 * The detail screen used to render only Instagram, via getInstagramUrl — so a
 * YouTube, TikTok or X link added in the editor saved fine and then appeared
 * nowhere, which read as the editor silently dropping it. Lucide removed its
 * brand icons, which is why the screen shows a labelled chip per link (plus
 * the one hand-drawn Instagram mark this repo carries) instead of a row of
 * indistinguishable generic glyphs.
 */
export function getSocialLinks(post: Post): ResolvedSocialLink[] {
  return (post.socialMediaLinks ?? [])
    .filter((link) => !!link.url?.trim())
    .map((link) => {
      const url = link.url.trim();
      const host = hostOf(url);
      const known = SOCIAL_PLATFORMS.find((platform) => host && platform.pattern.test(host));
      return {
        url,
        label: known?.label ?? link.platform?.trim() ?? host ?? url,
        isInstagram: known?.label === 'Instagram',
      };
    });
}

/**
 * Blocks the detail layout already renders through its own chrome — the hero
 * player, the Spotify section and the description — and which must therefore
 * not be repeated by BlockRenderer below.
 *
 * Only the blocks actually consumed belong here. The filter this replaced
 * excluded blocks by *type*, so a second YouTube embed, a second Spotify
 * block, or a text block on a post that already had a description were
 * dropped entirely: saved by the editor, then rendered nowhere.
 */
export function getConsumedBlocks(post: Post): Set<Post['blocks'][number]> {
  const consumed = new Set<Post['blocks'][number]>();

  // getYoutubeId only reaches the blocks when the post carries no YouTube
  // field of its own, and then takes the first match — mirror both rules.
  if (!post.youtubeVideoId && !post.youtubeUrl) {
    const hero = post.blocks.find(
      (block) =>
        (block.type === 'embed' && block.data.platform === 'youtube') ||
        (block.type === 'video' && !!block.data.url && !!extractYoutubeIdFromUrl(block.data.url)),
    );
    if (hero) consumed.add(hero);
  }

  // Same shape for getSpotifyEmbedUrl: platform link first, then the first
  // spotify block.
  if (!post.platforms?.some((platform) => platform.platform === 'SPOTIFY' && platform.externalUrl)) {
    const spotify = post.blocks.find((block) => block.type === 'spotify');
    if (spotify) consumed.add(spotify);
  }

  // Text blocks are matched against the description actually rendered, not
  // against whether post.description exists. An imported post carries a
  // description that repeats its first text block, so keying off the field
  // alone would either drop every text block (today's bug) or print the
  // first one twice.
  const description = getDescription(post);
  for (const block of post.blocks) {
    if (block.type !== 'text') continue;
    const text = textBlockContent(block.data.html);
    if (text && description.includes(text)) consumed.add(block);
  }

  return consumed;
}

function formatDurationSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

// Imported episodes fold "date · duration" into the text block — pull the
// duration (mm:ss or h:mm:ss) back out for the metadata row.
export function getDuration(post: Post): string | null {
  if (post.durationSeconds != null) return formatDurationSeconds(post.durationSeconds);
  for (const block of post.blocks) {
    if (block.type !== 'text') continue;
    const match = block.data.html.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
    if (match) return match[1];
  }
  return null;
}

/**
 * A text block's rendered plain text. Shared with getConsumedBlocks so the
 * two can't disagree about what a block's text is.
 */
export function textBlockContent(html: string): string {
  return (
    html
      .replace(/<[^>]+>/g, '')
      // drop the trailing "date · duration" metadata line if present
      .replace(/\n*[^\n]*·[^\n]*\d{1,2}:\d{2}[^\n]*$/, '')
      .trim()
  );
}

export function getDescription(post: Post): string {
  if (post.description) return post.description;
  const parts: string[] = [];
  for (const block of post.blocks) {
    if (block.type !== 'text') continue;
    const text = textBlockContent(block.data.html);
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}
