import { extractSpotifyInfo } from '@/features/podcast/services/spotify';
import type { Block, PostStatus, SocialMediaLink } from '@/shared/types/posts';

export type PodcastEpisodeJson = {
  title: string;
  description?: string;
  date?: string;
  duration?: string;
  url?: string;
  youtube_id?: string;
  youtube_url?: string;
  thumbnail?: string;
};

export type ImportablePost = {
  title: string;
  coverUrl: string;
  status: PostStatus;
  publishAt: string | null;
  blocks: Block[];
  socialMediaLinks?: SocialMediaLink[];
};

const PT_MONTHS: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

// Episode dates come as localized strings like "9 de mar. de 2021" or
// "1 de out." (no year when recent). Without a real publishAt the backend
// falls back to import time and the feed order/date display are wrong.
export function parseEpisodeDate(raw?: string): string | null {
  if (!raw) return null;
  const match = raw.trim().toLowerCase().match(/^(\d{1,2}) de ([a-zç]{3})\.?(?: de (\d{4}))?$/);
  if (match) {
    const month = PT_MONTHS[match[2]];
    if (month === undefined) return null;
    const day = parseInt(match[1], 10);
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    let date = new Date(Date.UTC(year, month, day));
    // A yearless date is always in the past; roll back a year if it lands ahead
    if (!match[3] && date.getTime() > Date.now()) {
      date = new Date(Date.UTC(year - 1, month, day));
    }
    return date.toISOString();
  }
  const parsed = new Date(raw.trim());
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// Accepts both supported file shapes:
//  - a bare array of raw podcast episodes ({title, description, date, url, youtube_id, …})
//  - an array (or {posts: [...]}) of pre-converted posts ({title, coverUrl, blocks, …})
export function parseImportJson(raw: string): ImportablePost[] {
  const parsed = JSON.parse(raw);
  const items: unknown = Array.isArray(parsed) ? parsed : (parsed as { posts?: unknown })?.posts;
  if (!Array.isArray(items)) {
    throw new Error('Expected a JSON array or an object with a "posts" array');
  }
  const posts = items.map((item) =>
    Array.isArray((item as { blocks?: unknown })?.blocks)
      ? convertPreconvertedPost(item as Record<string, unknown>)
      : convertEpisode(item as PodcastEpisodeJson)
  );
  // Export files list newest episodes first. When no item carries a date the
  // backend can only order by insertion time, so import oldest-first to keep
  // the newest episodes at the top of the feed.
  if (posts.length > 1 && posts.every((p) => p.publishAt === null)) {
    posts.reverse();
  }
  return posts;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function convertPreconvertedPost(item: Record<string, unknown>): ImportablePost {
  const blocks: Block[] = [];
  for (const rawBlock of (item.blocks as unknown[]) ?? []) {
    if (!rawBlock || typeof rawBlock !== 'object') continue;
    const b = rawBlock as Record<string, any>;
    if (b.type === 'text') {
      const html = String(b.data?.html ?? b.content ?? b.text ?? '');
      if (html) blocks.push({ type: 'text', data: { html } });
    } else if (b.type === 'spotify') {
      const url = String(b.data?.url ?? b.url ?? '');
      const info = url ? extractSpotifyInfo(url) : null;
      if (info) blocks.push({ type: 'spotify', data: { url, ...info } });
    } else if (b.type === 'youtube' || (b.type === 'embed' && (b.data?.platform ?? b.platform) === 'youtube')) {
      const id = String(b.data?.id ?? b.id ?? '') || extractYoutubeId(String(b.url ?? ''));
      if (id) blocks.push({ type: 'embed', data: { platform: 'youtube', id } });
    }
  }

  const rawLinks = Array.isArray(item.socialMediaLinks) ? (item.socialMediaLinks as Record<string, unknown>[]) : [];
  const socialMediaLinks: SocialMediaLink[] = rawLinks
    .filter((l) => l && typeof l.url === 'string' && l.url)
    .map((l) => ({
      url: String(l.url),
      ...(typeof l.platform === 'string' && l.platform ? { platform: l.platform } : {}),
    }));

  const status = item.status === 'draft' || item.status === 'scheduled' ? item.status : 'published';
  const publishAt =
    typeof item.publishAt === 'string' && item.publishAt
      ? parseEpisodeDate(item.publishAt)
      : parseEpisodeDate(typeof item.date === 'string' ? item.date : undefined);

  return {
    title: String(item.title ?? ''),
    coverUrl: String(item.coverUrl ?? item.thumbnail ?? ''),
    status,
    publishAt,
    blocks,
    socialMediaLinks: socialMediaLinks.length > 0 ? socialMediaLinks : undefined,
  };
}

function convertEpisode(ep: PodcastEpisodeJson): ImportablePost {
  const blocks: Block[] = [];

  const metaParts = [ep.date, ep.duration].filter(Boolean).join(' · ');
  const textContent = [ep.description, metaParts].filter(Boolean).join('\n\n');
  if (textContent) {
    blocks.push({ type: 'text', data: { html: textContent } });
  }

  if (ep.url) {
    const spotifyInfo = extractSpotifyInfo(ep.url);
    if (spotifyInfo) {
      blocks.push({ type: 'spotify', data: { url: ep.url, ...spotifyInfo } });
    }
  }

  if (ep.youtube_id) {
    blocks.push({ type: 'embed', data: { platform: 'youtube', id: ep.youtube_id } });
  }

  return {
    title: ep.title,
    coverUrl: ep.thumbnail ?? '',
    status: 'published',
    publishAt: parseEpisodeDate(ep.date),
    blocks,
  };
}
