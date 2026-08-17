import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type HomeCategoryConfig = components['schemas']['HomeVideoCategoryConfigResponse'];
export type HomeCategoryConfigMode = components['schemas']['HomeVideoCategoryConfigMode'];

/**
 * Admin mutations for the Home dashboard's video-category configuration
 * (Settings → Administration → Home Video Categories, gated by
 * FUNC_HOME_CATEGORY_CONFIG at the call site). Same submitting/toBffError
 * shape as useBrandingAdmin.ts/useCategoryAdmin.ts.
 */
export function useHomeCategoryAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const getConfig = useCallback(async (): Promise<HomeCategoryConfig> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/config/home/video-categories');
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updateConfig = useCallback(
    async (mode: HomeCategoryConfigMode, enabledCategoryIds: string[]): Promise<HomeCategoryConfig> => {
      setSubmitting(true);
      try {
        const { data, error, response } = await bffClient.PUT('/api/config/home/video-categories', {
          body: { mode, enabledCategoryIds },
        });
        if (error) throw toBffError(error, response.status);
        return data;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { submitting, getConfig, updateConfig };
}
