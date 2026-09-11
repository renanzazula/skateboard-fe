import type * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { appendImageFile, imageFilename } from '@/shared/api/formDataImage';
import { toBffError } from '@/shared/api/errors';
import type {
  Campaign,
  CampaignRequest,
  CampaignScreen,
  CampaignScreenRequest,
} from '@/features/campaign/types';

/**
 * Every campaign admin mutation (Settings → Administration → Startup Campaigns).
 * Reads need FUNC_CAMPAIGN_READ, create/edit/screens FUNC_CAMPAIGN_MANAGE,
 * publish/pause/archive FUNC_CAMPAIGN_PUBLISH — enforced by the BFF and
 * app-config-be; the screens just hide what the user can't do. Same
 * submitting/toBffError shape as useBrandingAdmin.ts.
 */
export function useCampaignAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setSubmitting(true);
    try {
      return await fn();
    } finally {
      setSubmitting(false);
    }
  }, []);

  const getCampaign = useCallback(
    (id: string) =>
      run(async () => {
        const { data, error, response } = await bffClient.GET('/api/campaigns/admin/{campaignId}', {
          params: { path: { campaignId: id } },
        });
        if (error || !data) throw toBffError(error, response.status);
        return data;
      }),
    [run]
  );

  const createCampaign = useCallback(
    (body: CampaignRequest) =>
      run(async () => {
        const { data, error, response } = await bffClient.POST('/api/campaigns/admin', { body });
        if (error || !data) throw toBffError(error, response.status);
        return data as Campaign;
      }),
    [run]
  );

  const updateCampaign = useCallback(
    (id: string, body: CampaignRequest) =>
      run(async () => {
        const { data, error, response } = await bffClient.PUT('/api/campaigns/admin/{campaignId}', {
          params: { path: { campaignId: id } },
          body,
        });
        if (error || !data) throw toBffError(error, response.status);
        return data as Campaign;
      }),
    [run]
  );

  const deleteCampaign = useCallback(
    (id: string) =>
      run(async () => {
        const { error, response } = await bffClient.DELETE('/api/campaigns/admin/{campaignId}', {
          params: { path: { campaignId: id } },
        });
        if (error) throw toBffError(error, response.status);
      }),
    [run]
  );

  const lifecycle = useCallback(
    (id: string, action: 'publish' | 'pause' | 'archive') =>
      run(async () => {
        const params = { params: { path: { campaignId: id } } } as const;
        const call = (() => {
          switch (action) {
            case 'publish':
              return bffClient.POST('/api/campaigns/admin/{campaignId}/publish', params);
            case 'pause':
              return bffClient.POST('/api/campaigns/admin/{campaignId}/pause', params);
            case 'archive':
              return bffClient.POST('/api/campaigns/admin/{campaignId}/archive', params);
          }
        })();
        const { data, error, response } = await call;
        if (error || !data) throw toBffError(error, response.status);
        return data as Campaign;
      }),
    [run]
  );

  const addScreen = useCallback(
    (campaignId: string, body: CampaignScreenRequest) =>
      run(async () => {
        const { data, error, response } = await bffClient.POST('/api/campaigns/admin/{campaignId}/screens', {
          params: { path: { campaignId } },
          body,
        });
        if (error || !data) throw toBffError(error, response.status);
        return data as CampaignScreen;
      }),
    [run]
  );

  const updateScreen = useCallback(
    (campaignId: string, screenId: string, body: CampaignScreenRequest) =>
      run(async () => {
        const { data, error, response } = await bffClient.PUT(
          '/api/campaigns/admin/{campaignId}/screens/{screenId}',
          { params: { path: { campaignId, screenId } }, body }
        );
        if (error || !data) throw toBffError(error, response.status);
        return data as CampaignScreen;
      }),
    [run]
  );

  const removeScreen = useCallback(
    (campaignId: string, screenId: string) =>
      run(async () => {
        const { error, response } = await bffClient.DELETE(
          '/api/campaigns/admin/{campaignId}/screens/{screenId}',
          { params: { path: { campaignId, screenId } } }
        );
        if (error) throw toBffError(error, response.status);
      }),
    [run]
  );

  const reorderScreens = useCallback(
    (campaignId: string, screenIds: string[]) =>
      run(async () => {
        const { data, error, response } = await bffClient.PUT(
          '/api/campaigns/admin/{campaignId}/screens/reorder',
          { params: { path: { campaignId } }, body: { screenIds } }
        );
        if (error || !data) throw toBffError(error, response.status);
        return data as Campaign;
      }),
    [run]
  );

  const uploadScreenImage = useCallback(
    (campaignId: string, screenId: string, asset: ImagePicker.ImagePickerAsset, focal?: { x: number; y: number }) =>
      run(async () => {
        const form = new FormData();
        const filename = asset.fileName ?? imageFilename('campaign-screen', asset.uri, asset.mimeType);
        await appendImageFile(form, 'file', { uri: asset.uri, filename, mimeType: asset.mimeType });
        if (focal) {
          form.append('focalPointX', String(focal.x));
          form.append('focalPointY', String(focal.y));
        }
        const { data, error, response } = await bffClient.POST(
          '/api/campaigns/admin/{campaignId}/screens/{screenId}/image',
          {
            params: { path: { campaignId, screenId } },
            body: form as unknown as { file: string },
          }
        );
        if (error || !data) throw toBffError(error, response.status);
        return data as CampaignScreen;
      }),
    [run]
  );

  return {
    submitting,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    lifecycle,
    addScreen,
    updateScreen,
    removeScreen,
    reorderScreens,
    uploadScreenImage,
  };
}
