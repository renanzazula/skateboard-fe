import type { components } from '@/core/api/generated/schema';
import type { Video } from '@/shared/types/video';

type HomeVideoResponse = components['schemas']['HomeVideoResponse'];

export function toVideo(response: HomeVideoResponse): Video {
  return {
    id: response.id ?? '',
    slug: response.slug ?? '',
    title: response.title ?? '',
    thumbnailUrl: response.thumbnailUrl ?? null,
    youtubeVideoId: response.youtubeVideoId ?? null,
    category: response.category ?? null,
  };
}
