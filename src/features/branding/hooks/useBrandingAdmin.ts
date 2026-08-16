import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type BrandingConfig = components['schemas']['BrandingConfigResponse'];
export type BrandingAsset = components['schemas']['BrandingAssetResponse'];

/**
 * Admin mutations for the Branding feature (Settings → Branding, gated by
 * FUNC_TAB_SETTINGS_BRANDING at the call site). Same submitting/toBffError
 * shape as usePodcastAdmin.ts; upload/replace calls reuse
 * useAccountActions.uploadProfilePicture's Blob-from-asset.uri pattern —
 * the RN `{uri,name,type}` FormData shape doesn't attach a real file part on
 * web (react-native-web just stringifies it).
 */
export function useBrandingAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const assetToBlob = async (asset: ImagePicker.ImagePickerAsset) => {
    const extension = asset.uri.split('.').pop() ?? 'jpg';
    const filename = asset.fileName ?? `branding.${extension}`;
    const blob = await (await fetch(asset.uri)).blob();
    return { blob, filename };
  };

  const getBrandingConfig = useCallback(async (): Promise<BrandingConfig> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/config/branding');
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const uploadLoginBackground = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<BrandingConfig> => {
    setSubmitting(true);
    try {
      const { blob, filename } = await assetToBlob(asset);
      const form = new FormData();
      form.append('file', blob, filename);
      const { data, error, response } = await bffClient.POST('/api/config/branding/login-background', {
        body: form as unknown as { file: string },
      });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const removeLoginBackground = useCallback(async (): Promise<BrandingConfig> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.DELETE('/api/config/branding/login-background');
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const uploadAppLogo = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<BrandingConfig> => {
    setSubmitting(true);
    try {
      const { blob, filename } = await assetToBlob(asset);
      const form = new FormData();
      form.append('file', blob, filename);
      const { data, error, response } = await bffClient.POST('/api/config/branding/app-logo', {
        body: form as unknown as { file: string },
      });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const removeAppLogo = useCallback(async (): Promise<BrandingConfig> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.DELETE('/api/config/branding/app-logo');
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const listBrandingAssets = useCallback(async (): Promise<BrandingAsset[]> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/config/branding/assets');
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const uploadBrandingAsset = useCallback(
    async (name: string, asset: ImagePicker.ImagePickerAsset): Promise<BrandingAsset> => {
      setSubmitting(true);
      try {
        const { blob, filename } = await assetToBlob(asset);
        const form = new FormData();
        form.append('name', name);
        form.append('file', blob, filename);
        const { data, error, response } = await bffClient.POST('/api/config/branding/assets', {
          body: form as unknown as { name: string; file: string },
        });
        if (error) throw toBffError(error, response.status);
        return data;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const replaceBrandingAsset = useCallback(
    async (assetId: string, asset: ImagePicker.ImagePickerAsset): Promise<BrandingAsset> => {
      setSubmitting(true);
      try {
        const { blob, filename } = await assetToBlob(asset);
        const form = new FormData();
        form.append('file', blob, filename);
        const { data, error, response } = await bffClient.PUT('/api/config/branding/assets/{assetId}', {
          params: { path: { assetId } },
          body: form as unknown as { file: string },
        });
        if (error) throw toBffError(error, response.status);
        return data;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const removeBrandingAsset = useCallback(async (assetId: string): Promise<void> => {
    setSubmitting(true);
    try {
      const { error, response } = await bffClient.DELETE('/api/config/branding/assets/{assetId}', {
        params: { path: { assetId } },
      });
      if (error) throw toBffError(error, response.status);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    submitting,
    getBrandingConfig,
    uploadLoginBackground,
    removeLoginBackground,
    uploadAppLogo,
    removeAppLogo,
    listBrandingAssets,
    uploadBrandingAsset,
    replaceBrandingAsset,
    removeBrandingAsset,
  };
}
