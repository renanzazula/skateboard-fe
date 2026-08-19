import type { components } from '@/core/api/generated/schema';
import type { Post } from '@/shared/types/posts';

type PostResponse = components['schemas']['PostResponse'];

// podcast-be's PostResponse.blocks is typed as an opaque
// `{[key: string]: unknown}[]` in the OpenAPI spec — its own description
// says "Ordered array of typed content blocks", i.e. the backend contract
// already guarantees the Block[] shape at runtime; the spec just doesn't
// encode the discriminated union. This narrows it at the FE boundary.
export function toPost(response: PostResponse): Post {
  return {
    id: response.id ?? '',
    slug: response.slug ?? '',
    title: response.title ?? '',
    status: response.status ?? 'published',
    publishAt: response.publishAt ?? null,
    coverUrl: response.coverUrl ?? '',
    blocks: (response.blocks ?? []) as unknown as Post['blocks'],
    socialMediaLinks: response.socialMediaLinks,
    createdAt: response.createdAt ?? '',
    updatedAt: response.updatedAt ?? '',
    createdBy: response.createdBy ?? '',
    youtubeVideoId: response.youtubeVideoId,
    youtubeUrl: response.youtubeUrl,
    description: response.description,
    durationSeconds: response.durationSeconds,
    episodeNumber: response.episodeNumber,
    platforms: response.platforms
      ?.filter((p) => p.platform != null)
      .map((p) => ({ platform: p.platform as 'YOUTUBE' | 'SPOTIFY', externalUrl: p.externalUrl ?? null })),
  };
}
