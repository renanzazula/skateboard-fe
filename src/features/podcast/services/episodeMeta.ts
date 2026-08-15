import type { Post } from '@/shared/types/posts';

// Posts created by podcast-be's YouTube sync job (see
// .docs/README-youtube-data-api-sync.md) carry these as structured fields
// directly on the Post response — no parsing needed. Posts that predate the
// sync (manually authored/imported) leave them null, so every getter below
// falls back to the legacy block/title parsing for those.

export function getYoutubeId(post: Post): string | null {
  if (post.youtubeVideoId) return post.youtubeVideoId;
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

export function getSpotifyEmbedUrl(post: Post): string | null {
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

export function getDescription(post: Post): string {
  if (post.description) return post.description;
  const parts: string[] = [];
  for (const block of post.blocks) {
    if (block.type !== 'text') continue;
    const text = block.data.html
      .replace(/<[^>]+>/g, '')
      // drop the trailing "date · duration" metadata line if present
      .replace(/\n*[^\n]*·[^\n]*\d{1,2}:\d{2}[^\n]*$/, '')
      .trim();
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}
