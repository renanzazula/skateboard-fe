import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type AdminCategory = components['schemas']['AdminCategoryResponse'];

/**
 * Admin mutations for podcast categories — list/rename/reorder/set-default,
 * all gated by FUNC_PODCAST_MANAGE_CATEGORIES at the call site. Follows the
 * usePodcastAdmin pattern: one `submitting` flag across mutations, errors
 * thrown as BffError.
 */
export function useCategoryAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const listCategories = useCallback(async (): Promise<AdminCategory[]> => {
    const { data, error, response } = await bffClient.GET('/api/admin/categories');
    if (error) throw toBffError(error, response.status);
    return data ?? [];
  }, []);

  /** `name` null/blank resets the display name to the YouTube playlist title. */
  const renameCategory = useCallback(async (id: string, name: string | null): Promise<AdminCategory> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PATCH('/api/admin/categories/{id}', {
        params: { path: { id } },
        body: { name },
      });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  /** Takes the complete ordered id list — every category, disabled ones included. */
  const reorderCategories = useCallback(async (categoryIds: string[]): Promise<AdminCategory[]> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/admin/categories/order', {
        body: { categoryIds },
      });
      if (error) throw toBffError(error, response.status);
      return data ?? [];
    } finally {
      setSubmitting(false);
    }
  }, []);

  const setDefaultCategory = useCallback(async (id: string): Promise<AdminCategory> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/admin/categories/{id}/default', {
        params: { path: { id } },
      });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, listCategories, renameCategory, reorderCategories, setDefaultCategory };
}
