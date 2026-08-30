import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ImageCropper, type ImageCropperHandle } from '@/shared/components/image-upload/ImageCropper';
import type { CropRect } from '@/shared/components/image-upload/cropMath';
import { useImageSource } from '@/shared/components/image-upload/useImageSource';
import { ImageSourceRejectedError, type ImageUploadConstraints, type ProcessedImageAsset } from '@/shared/components/image-upload/types';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { SecondaryButton } from '@/shared/components/SecondaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

type Step = 'source' | 'preview' | 'crop' | 'processing' | 'error';

type Props = {
  visible: boolean;
  title?: string;
  constraints: ImageUploadConstraints;
  onCancel: () => void;
  onConfirm: (asset: ProcessedImageAsset) => void;
};

const REJECTION_KEYS = {
  unsupported_type: 'imageUpload.rejectedUnsupportedType',
  file_too_large: 'imageUpload.rejectedTooLarge',
  resolution_too_small: 'imageUpload.rejectedTooSmall',
  resolution_too_large: 'imageUpload.rejectedTooLarge',
} as const satisfies Record<string, string>;

function saveFormatFor(mimeType: string | null | undefined): SaveFormat {
  if (mimeType === 'image/png') return SaveFormat.PNG;
  if (mimeType === 'image/webp') return SaveFormat.WEBP;
  return SaveFormat.JPEG;
}

async function processAsset(
  asset: ImagePickerAsset,
  cropRect: CropRect | null,
  constraints: ImageUploadConstraints
): Promise<ProcessedImageAsset> {
  const needsResize = constraints.outputWidth != null || constraints.outputHeight != null;
  if (!cropRect && !needsResize) {
    // Nothing to crop or resize — hand the original back untouched rather
    // than round-tripping it through a lossy re-encode for no reason.
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSizeBytes: asset.fileSize ?? 0,
    };
  }

  let context = ImageManipulator.manipulate(asset.uri);
  if (cropRect) {
    context = context.crop(cropRect);
  }
  if (needsResize) {
    context = context.resize({ width: constraints.outputWidth, height: constraints.outputHeight });
  }
  const rendered = await context.renderAsync();
  const format = saveFormatFor(asset.mimeType);
  const saved = await rendered.saveAsync({ compress: 0.9, format });

  // Best-effort — not every platform can stat a freshly-manipulated file
  // (e.g. web's blob: URIs); the caller re-derives the real byte size from
  // the blob it actually uploads anyway (same pattern as useAccountActions.ts).
  let fileSizeBytes = 0;
  try {
    const info = await FileSystem.getInfoAsync(saved.uri);
    if (info.exists && !info.isDirectory) fileSizeBytes = info.size;
  } catch {
    // ignore
  }

  return {
    uri: saved.uri,
    width: saved.width,
    height: saved.height,
    mimeType: format === SaveFormat.PNG ? 'image/png' : format === SaveFormat.WEBP ? 'image/webp' : 'image/jpeg',
    fileSizeBytes,
  };
}

/**
 * Global, feature-agnostic image upload flow: select -> preview -> optional
 * resize/crop -> confirm. Never calls a network API itself — onConfirm hands
 * back a processed local asset for the caller's own upload call. Configure
 * `constraints` per use case (aspectRatio, output size, allowed types/size/
 * resolution) — e.g. `{ aspectRatio: 1 }` for a profile picture, a wider
 * ratio for a login background.
 */
export function ImageUploadDialog({ visible, title, constraints, onCancel, onConfirm }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { pickFromLibrary, pickFromCamera } = useImageSource(constraints);
  const cropperRef = useRef<ImageCropperHandle>(null);

  const [step, setStep] = useState<Step>('source');
  const [asset, setAsset] = useState<ImagePickerAsset | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cardWidth = Math.min(windowWidth - Spacing.four * 2, 420);
  const cropAreaSize = cardWidth - Spacing.four * 2;

  const reset = () => {
    setStep('source');
    setAsset(null);
    setErrorMessage(null);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handlePicked = (picked: ImagePickerAsset | null) => {
    if (!picked) return;
    setAsset(picked);
    setStep(constraints.aspectRatio != null ? 'crop' : 'preview');
  };

  const handlePickError = (err: unknown) => {
    if (err instanceof ImageSourceRejectedError) {
      const key = REJECTION_KEYS[err.reason as keyof typeof REJECTION_KEYS];
      setErrorMessage(key ? t(key) : t('imageUpload.couldNotUse'));
    } else {
      setErrorMessage(err instanceof Error ? err.message : t('imageUpload.couldNotSelect'));
    }
    setStep('error');
  };

  const handleUsePhoto = async () => {
    if (!asset) return;
    setStep('processing');
    try {
      const cropRect = step === 'crop' ? cropperRef.current?.getCropRect() ?? null : null;
      const processed = await processAsset(asset, cropRect, constraints);
      reset();
      onConfirm(processed);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('imageUpload.couldNotProcess'));
      setStep('error');
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleCancel}>
      {/* RN's Modal renders into its own native root, so the app-level
          GestureHandlerRootView (in _layout.tsx) doesn't cover it — the
          cropper's pan/pinch/corner-drag gestures need one in here too. */}
      <GestureHandlerRootView style={styles.backdrop}>
        <ThemedView style={styles.backdrop}>
          <ThemedView type="surface" style={[styles.card, { width: cardWidth, borderColor: theme.border }]}>
            <ThemedText type="subtitle" style={styles.title}>
              {title ?? t('imageUpload.defaultTitle')}
            </ThemedText>

            {step === 'source' ? (
              <View style={styles.sourceActions}>
                <PrimaryButton
                  title={t('imageUpload.chooseFromLibrary')}
                  onPress={() => pickFromLibrary().then(handlePicked).catch(handlePickError)}
                />
                <SecondaryButton
                  title={t('imageUpload.takePhoto')}
                  onPress={() => pickFromCamera().then(handlePicked).catch(handlePickError)}
                />
                <SecondaryButton title={t('common.cancel')} onPress={handleCancel} />
              </View>
            ) : null}

            {step === 'preview' && asset ? (
              <View>
                <Image source={{ uri: asset.uri }} style={{ width: cropAreaSize, height: cropAreaSize, borderRadius: RADII.control }} contentFit="contain" />
                <View style={styles.footerActions}>
                  <SecondaryButton title={t('imageUpload.retake')} onPress={reset} />
                  <PrimaryButton title={t('imageUpload.usePhoto')} onPress={handleUsePhoto} />
                </View>
              </View>
            ) : null}

            {step === 'crop' && asset && constraints.aspectRatio != null ? (
              <View>
                <ImageCropper
                  ref={cropperRef}
                  imageUri={asset.uri}
                  imageWidth={asset.width}
                  imageHeight={asset.height}
                  aspectRatio={constraints.aspectRatio}
                  containerWidth={cropAreaSize}
                  containerHeight={Math.min(cropAreaSize, windowHeight * 0.5)}
                />
                <View style={styles.footerActions}>
                  <SecondaryButton title={t('imageUpload.retake')} onPress={reset} />
                  <PrimaryButton title={t('imageUpload.usePhoto')} onPress={handleUsePhoto} />
                </View>
              </View>
            ) : null}

            {step === 'processing' ? (
              <View style={styles.processing}>
                <ActivityIndicator color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('imageUpload.processing')}
                </ThemedText>
              </View>
            ) : null}

            {step === 'error' ? (
              <View>
                <ThemedText type="small" themeColor="destructive" style={styles.errorText}>
                  {errorMessage}
                </ThemedText>
                <View style={styles.footerActions}>
                  <SecondaryButton title={t('common.cancel')} onPress={handleCancel} />
                  <PrimaryButton title={t('imageUpload.tryAgain')} onPress={reset} />
                </View>
              </View>
            ) : null}
          </ThemedView>
        </ThemedView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: RADII.card,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  sourceActions: {
    gap: Spacing.two,
  },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  processing: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  errorText: {
    textAlign: 'center',
  },
});
