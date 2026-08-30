import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { setProfile } from '@/features/account/hooks/useProfile';
import { isBffError } from '@/shared/api/errors';
import { ImageUploadDialog, type ProcessedImageAsset } from '@/shared/components/image-upload';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

const AVATAR_SIZE = 60;
const BADGE_SIZE = 24;
// Uploaded well above the 60pt on-screen size for retina displays and any
// other place the picture renders larger (e.g. a future profile screen).
const OUTPUT_SIZE = 512;

type Props = {
  imageUrl: string | null;
  initials: string;
  onUploaded: () => void;
};

/**
 * Avatar + camera badge — the whole element is the upload control (no
 * separate "Profile picture" row). Tapping opens ImageUploadDialog (source
 * picker → square crop → upload); there's no "Remove" option since the BFF
 * only exposes POST /api/me/profile-picture (upload/replace), not a delete.
 * See .docs/SETTINGS_REDESIGN_2.md §6/§7.
 */
export function EditableAvatar({ imageUrl, initials, onUploaded }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { uploadProfilePicture, submitting } = useAccountActions();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Reset once the URL itself changes (e.g. a fresh upload), so a past
  // failure doesn't permanently pin the fallback for the new image.
  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = !!imageUrl && !imageFailed;

  const handleConfirm = async (asset: ProcessedImageAsset) => {
    setDialogVisible(false);
    try {
      const updated = await uploadProfilePicture(asset);
      // Apply the upload's own response immediately (it already is the
      // fresh profile) instead of waiting on a second /api/me round trip —
      // updates every screen sharing useProfile()'s store right away.
      setProfile(updated);
      onUploaded();
    } catch (actionError) {
      showAlert(t('settings.profilePictureError'), isBffError(actionError) ? actionError.message : t('common.tryAgain'));
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setDialogVisible(true)}
        disabled={submitting}
        style={styles.wrapper}
        accessibilityRole="button"
        accessibilityLabel={t('settings.changeProfilePicture')}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          {showImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Text style={[styles.initials, { color: theme.onPrimary }]}>{initials}</Text>
          )}
          {submitting ? (
            <View style={[StyleSheet.absoluteFill, styles.uploadOverlay]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
          <Camera size={12} color={theme.onPrimary} strokeWidth={2.5} />
        </View>
      </Pressable>

      <ImageUploadDialog
        visible={dialogVisible}
        title={t('settings.profilePicture')}
        constraints={{ aspectRatio: 1, outputWidth: OUTPUT_SIZE, outputHeight: OUTPUT_SIZE }}
        onCancel={() => setDialogVisible(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  initials: {
    fontSize: 20,
    fontWeight: '700',
  },
  uploadOverlay: {
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
