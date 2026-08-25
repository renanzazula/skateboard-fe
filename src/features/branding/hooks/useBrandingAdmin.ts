import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';
import { appendImageFile, imageFilename } from '@/shared/api/formDataImage';

export type BrandingConfig = components['schemas']['BrandingConfigResponse'];
export type BrandingAsset = components['schemas']['BrandingAssetResponse'];

/**
 * Admin mutations for the Branding feature (Settings → Branding, gated by
 * FUNC_TAB_SETTINGS_BRANDING at the call site). Same submitting/toBffError
 * shape as usePodcastAdmin.ts. Upload/replace calls attach their file via
 * shared/api/formDataImage, which picks the file-part shape each platform
 * actually accepts — see that module for why one shape can't serve both.
 */
export function useBrandingAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const appendAsset = async (form: FormData, asset: ImagePicker.ImagePickerAsset) => {
    const filename = asset.fileName ?? imageFilename('branding', asset.uri, asset.mimeType);
    await appendImageFile(form, 'file', { uri: asset.uri, filename, mimeType: asset.mimeType });
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
      const form = new FormData();
      await appendAsset(form, asset);
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

  const updateLoginText = useCallback(async (title: string, message: string): Promise<BrandingConfig> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/config/branding/login-text', {
        body: { title: title || null, message: message || null },
      });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const uploadAppLogo = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<BrandingConfig> => {
    setSubmitting(true);
    try {
      const form = new FormData();
      await appendAsset(form, asset);
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
        const form = new FormData();
        form.append('name', name);
        await appendAsset(form, asset);
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
        const form = new FormData();
        await appendAsset(form, asset);
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
    updateLoginText,
    uploadAppLogo,
    removeAppLogo,
    listBrandingAssets,
    uploadBrandingAsset,
    replaceBrandingAsset,
    removeBrandingAsset,
  };
}
