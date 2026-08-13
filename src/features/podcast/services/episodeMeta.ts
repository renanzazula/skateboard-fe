import type { Post } from '@/shared/types/posts';

export function getYoutubeId(post: Post): string | null {
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

// Imported episodes fold "date · duration" into the text block — pull the
// duration (mm:ss or h:mm:ss) back out for the metadata row.
export function getDuration(post: Post): string | null {
  for (const block of post.blocks) {
    if (block.type !== 'text') continue;
    const match = block.data.html.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
    if (match) return match[1];
  }
  return null;
}

export function getDescription(post: Post): string {
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
