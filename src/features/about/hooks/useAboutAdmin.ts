import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import { appendImageFile, imageFilename } from '@/shared/api/formDataImage';
import { toAboutPage, type AboutPage, type AboutPageStatus, type ContentBlock } from '@/features/about/types';

export interface SaveAboutPageInput {
  title: string;
  subtitle?: string | null;
  status: AboutPageStatus;
  blocks: ContentBlock[];
}

/**
 * Admin mutations for the About Us page (Settings → Administration → About Us,
 * gated by FUNC_ABOUT_US_MANAGE at the call site). Same submitting/toBffError
 * shape as features/branding/hooks/useBrandingAdmin.ts. The image upload picks
 * the multipart file-part shape each platform actually accepts via
 * shared/api/formDataImage.
 */
export function useAboutAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const getAboutPage = useCallback(async (): Promise<AboutPage | null> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/about-us/admin');
      if (response.status === 204) return null;
      if (error || !data) throw toBffError(error, response.status);
      return toAboutPage(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const saveAboutPage = useCallback(async (input: SaveAboutPageInput): Promise<AboutPage> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/about-us', {
        body: {
          title: input.title,
          subtitle: input.subtitle ?? null,
          status: input.status,
          // ContentBlock[] serializes to the opaque object array the BFF expects.
          blocks: input.blocks as unknown as Record<string, unknown>[],
        },
      });
      if (error || !data) throw toBffError(error, response.status);
      return toAboutPage(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const uploadImage = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    setSubmitting(true);
    try {
      const form = new FormData();
      const filename = asset.fileName ?? imageFilename('about', asset.uri, asset.mimeType);
      await appendImageFile(form, 'file', { uri: asset.uri, filename, mimeType: asset.mimeType });
      const { data, error, response } = await bffClient.POST('/api/about-us/images', {
        body: form as unknown as { file: string },
      });
      if (error || !data) throw toBffError(error, response.status);
      return data.url;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, getAboutPage, saveAboutPage, uploadImage };
}
