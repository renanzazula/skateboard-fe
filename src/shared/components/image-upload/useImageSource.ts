import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';

import { ImageSourceRejectedError, type ImageUploadConstraints } from '@/shared/components/image-upload/types';

/** Same permission-request-then-launch shape already used by useAccountActions.ts. */
function validate(asset: ImagePicker.ImagePickerAsset, constraints: ImageUploadConstraints): void {
  if (constraints.allowedTypes?.length && asset.mimeType && !constraints.allowedTypes.includes(asset.mimeType)) {
    throw new ImageSourceRejectedError('unsupported_type');
  }
  if (constraints.maxFileSizeBytes != null && asset.fileSize != null && asset.fileSize > constraints.maxFileSizeBytes) {
    throw new ImageSourceRejectedError('file_too_large');
  }
  // width/height are 0 when the platform didn't report them (some web
  // pickers) — nothing to validate against in that case rather than
  // rejecting a possibly-fine image on missing metadata.
  if (asset.width && asset.height) {
    if (
      (constraints.minWidth != null && asset.width < constraints.minWidth) ||
      (constraints.minHeight != null && asset.height < constraints.minHeight)
    ) {
      throw new ImageSourceRejectedError('resolution_too_small');
    }
    if (
      (constraints.maxWidth != null && asset.width > constraints.maxWidth) ||
      (constraints.maxHeight != null && asset.height > constraints.maxHeight)
    ) {
      throw new ImageSourceRejectedError('resolution_too_large');
    }
  }
}

/** Picking + pre-crop validation, decoupled from any specific feature — see ImageUploadDialog.tsx. */
export function useImageSource(constraints: ImageUploadConstraints) {
  const pickFromLibrary = useCallback(async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo library permission is required to select an image.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    validate(asset, constraints);
    return asset;
  }, [constraints]);

  const pickFromCamera = useCallback(async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera permission is required to take a photo.');
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    validate(asset, constraints);
    return asset;
  }, [constraints]);

  return { pickFromLibrary, pickFromCamera };
}
