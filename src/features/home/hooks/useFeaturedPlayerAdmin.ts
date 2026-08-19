import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type FeaturedPlayerConfig = components['schemas']['HomeFeaturedPlayerConfigResponse'];
export type FeaturedContentSource = components['schemas']['FeaturedContentSource'];
export type HomePlayerType = components['schemas']['HomePlayerType'];
export type HomePlayerPosition = components['schemas']['HomePlayerPosition'];
export type PreferredPlaybackPlatform = components['schemas']['PreferredPlaybackPlatform'];

/**
 * Admin mutations for the Home dashboard's Featured Player configuration
 * (Settings → Administration → Featured Player, gated by
 * FUNC_HOME_FEATURED_PLAYER_CONFIG at the call site). Same
 * submitting/toBffError shape as useHomeCategoryAdmin.ts.
 */
export function useFeaturedPlayerAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const getConfig = useCallback(async (): Promise<FeaturedPlayerConfig> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/config/home/featured-player');
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updateConfig = useCallback(
    async (config: {
      enabled: boolean;
      contentSource: FeaturedContentSource | null;
      contentId: string | null;
      playerType: HomePlayerType;
      position: HomePlayerPosition;
      preferredPlatform?: PreferredPlaybackPlatform | null;
    }): Promise<FeaturedPlayerConfig> => {
      setSubmitting(true);
      try {
        const { data, error, response } = await bffClient.PUT('/api/config/home/featured-player', {
          body: config,
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
