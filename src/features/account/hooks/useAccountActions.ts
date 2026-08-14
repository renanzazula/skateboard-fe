import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

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

  const uploadProfilePicture = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<UserProfile> => {
    setSubmitting(true);
    try {
      const extension = asset.uri.split('.').pop() ?? 'jpg';
      const filename = asset.fileName ?? `profile-picture.${extension}`;

      // Appending { uri, name, type } directly to FormData is a React
      // Native-only convention (RN's native networking layer special-cases
      // that shape) — on web (react-native-web) it just stringifies the
      // object instead of attaching a real file part, so the BFF sees no
      // "file" part at all. Fetching the picked asset's own URI and taking
      // its Blob works on both: RN's fetch supports local file:// URIs, and
      // on web the picker already hands back a blob:/data: URL.
      const blob = await (await fetch(asset.uri)).blob();

      // The generated type for this multipart/form-data operation is a
      // structural placeholder ({ file: string }, format: binary) —
      // openapi-fetch's default body serializer passes FormData through
      // untouched at runtime (see openapi-fetch's defaultBodySerializer),
      // so the cast below is just satisfying the static type, not lying to
      // the actual request.
      const form = new FormData();
      form.append('file', blob, filename);

      const { data, error, response } = await bffClient.POST('/api/me/profile-picture', {
        body: form as unknown as { file: string },
      });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  /** Requests photo library permission, lets the user pick an image, and uploads it. Returns null if the user cancels. */
  const pickAndUploadProfilePicture = useCallback(async (): Promise<UserProfile | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo library permission is required to change your profile picture.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.length) {
      return null;
    }
    return uploadProfilePicture(result.assets[0]);
  }, [uploadProfilePicture]);

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
    pickAndUploadProfilePicture,
    changePassword,
    deactivateAccount,
    deleteAccount,
  };
}
