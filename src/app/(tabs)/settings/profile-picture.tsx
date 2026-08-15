import { router } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

const AVATAR_SIZE = 160;

export default function ProfilePictureScreen() {
  const theme = useTheme();
  const { profile, isLoading, refresh } = useProfile();
  const { pickAndUploadProfilePicture, submitting } = useAccountActions();

  const handlePick = async () => {
    try {
      const updated = await pickAndUploadProfilePicture();
      if (updated) {
        await refresh();
        router.back();
      }
    } catch (submitError) {
      showAlert('Could not update profile picture', isBffError(submitError) ? submitError.message : 'Try again.');
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.container}>
        <ThemedView type="surface" style={[styles.avatarWrapper, { borderColor: theme.border }]}>
          {isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : profile?.profilePictureUrl ? (
            <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatar} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No picture yet
            </ThemedText>
          )}
        </ThemedView>

        <PrimaryButton
          title={submitting ? 'Uploading…' : 'Choose a photo'}
          onPress={handlePick}
          loading={submitting}
          disabled={submitting}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    gap: Spacing.four,
    padding: Spacing.three,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
});
