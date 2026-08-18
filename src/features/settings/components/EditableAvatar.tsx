import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { isBffError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

const AVATAR_SIZE = 60;
const BADGE_SIZE = 24;

type Props = {
  imageUrl: string | null;
  initials: string;
  onUploaded: () => void;
};

/**
 * Avatar + camera badge — the whole element is the upload control (no
 * separate "Profile picture" row). Tapping opens a chooser (Take photo /
 * Choose from library); there's no "Remove" option since the BFF only
 * exposes POST /api/me/profile-picture (upload/replace), not a delete.
 * See .docs/SETTINGS_REDESIGN_2.md §6/§7.
 */
export function EditableAvatar({ imageUrl, initials, onUploaded }: Props) {
  const theme = useTheme();
  const { pickAndUploadProfilePicture, takeAndUploadProfilePicture, submitting } = useAccountActions();
  const [sheetVisible, setSheetVisible] = useState(false);

  const runAction = async (action: () => Promise<unknown>) => {
    setSheetVisible(false);
    try {
      const updated = await action();
      if (updated) onUploaded();
    } catch (actionError) {
      showAlert('Could not update profile picture', isBffError(actionError) ? actionError.message : 'Try again.');
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setSheetVisible(true)}
        disabled={submitting}
        style={styles.wrapper}
        accessibilityRole="button"
        accessibilityLabel="Change profile picture">
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" cachePolicy="memory-disk" />
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

      <Modal animationType="slide" transparent visible={sheetVisible} onRequestClose={() => setSheetVisible(false)}>
        <ThemedView style={styles.backdrop}>
          <ThemedView type="surface" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Profile picture</ThemedText>
            <Pressable onPress={() => runAction(takeAndUploadProfilePicture)} style={styles.optionRow}>
              <ThemedText type="smallBold">Take photo</ThemedText>
            </Pressable>
            <Pressable onPress={() => runAction(pickAndUploadProfilePicture)} style={styles.optionRow}>
              <ThemedText type="smallBold">Choose from library</ThemedText>
            </Pressable>
            <Pressable onPress={() => setSheetVisible(false)} style={styles.cancelButton}>
              <ThemedText type="smallBold" themeColor="primary">
                Cancel
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </Modal>
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
  },
  card: {
    borderRadius: RADII.card,
    borderWidth: 1,
    gap: Spacing.one,
    padding: Spacing.four,
  },
  optionRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: RADII.control,
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
});
