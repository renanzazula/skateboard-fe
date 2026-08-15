import type { components } from '@/core/api/generated/schema';
import type { Category } from '@/shared/types/category';

type CategoryResponse = components['schemas']['CategoryResponse'];

export function toCategory(response: CategoryResponse): Category {
  return {
    id: response.id ?? '',
    slug: response.slug ?? '',
    name: response.name ?? '',
    coverUrl: response.coverUrl ?? null,
    isDefault: response.default ?? false,
    postCount: response.postCount ?? 0,
  };
}
