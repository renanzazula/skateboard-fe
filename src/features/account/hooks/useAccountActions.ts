import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import type { ProcessedImageAsset } from '@/shared/components/image-upload';
import { toBffError } from '@/shared/api/errors';
import { appendImageFile, imageFilename } from '@/shared/api/formDataImage';

export type UserProfile = components['schemas']['UserResponse'];

/**
 * Account mutations for the Settings feature — username/profile-picture/password
 * changes and deactivate/delete, each gated by its own FUNC_USER_* authority at
 * the call site (see settings/index.tsx). Same submitting/toBffError shape as
 * usePodcastAdmin.ts.
 */
export function useAccountActions() {
  const [submitting, setSubmitting] = useState(false);

  const changeUsername = useCallback(async (username: string): Promise<UserProfile> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.POST('/api/me/username', { body: { username } });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  /** Uploads an already-cropped/resized asset from ImageUploadDialog (see EditableAvatar.tsx). */
  const uploadProfilePicture = useCallback(async (asset: ProcessedImageAsset): Promise<UserProfile> => {
    setSubmitting(true);
    try {
      const filename = imageFilename('profile-picture', asset.uri, asset.mimeType);

      // The generated type for this multipart/form-data operation is a
      // structural placeholder ({ file: string }, format: binary) —
      // openapi-fetch's default body serializer passes FormData through
      // untouched at runtime (see openapi-fetch's defaultBodySerializer),
      // so the cast below is just satisfying the static type, not lying to
      // the actual request.
      const form = new FormData();
      await appendImageFile(form, 'file', { uri: asset.uri, filename, mimeType: asset.mimeType });

      const { data, error, response } = await bffClient.POST('/api/me/profile-picture', {
        body: form as unknown as { file: string },
      });
      // openapi-fetch types `data` as optional even when `error` is falsy
      // (e.g. an unexpected empty body) — silently returning it as-is would
      // make EditableAvatar's `if (updated)` guard no-op the whole update,
      // which looks exactly like "upload succeeded but the picture never
      // changes" with no error shown anywhere.
      if (error || !data) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<void> => {
    setSubmitting(true);
    try {
      const { error, response } = await bffClient.POST('/api/me/change-password', { body: { newPassword } });
      if (error) throw toBffError(error, response.status);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deactivateAccount = useCallback(async (): Promise<void> => {
    setSubmitting(true);
    try {
      const { error, response } = await bffClient.POST('/api/me/deactivate');
      if (error) throw toBffError(error, response.status);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<void> => {
    setSubmitting(true);
    try {
      const { error, response } = await bffClient.DELETE('/api/me');
      if (error) throw toBffError(error, response.status);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    submitting,
    changeUsername,
    uploadProfilePicture,
    changePassword,
    deactivateAccount,
    deleteAccount,
  };
}
