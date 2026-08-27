import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';
import { showAlert } from '@/shared/utils/alert';

const MIN_LENGTH = 3;

/** Reached from the Username row on Settings → Your account. Same shape as change-password.tsx. */
export default function UsernameScreen() {
  const { profile, refresh } = useProfile();
  const { changeUsername, submitting } = useAccountActions();
  const [username, setUsername] = useState(profile?.username ?? '');

  const trimmed = username.trim();
  const unchanged = trimmed === (profile?.username ?? '');

  const handleSave = async () => {
    if (trimmed.length < MIN_LENGTH) {
      showAlert('Username too short', `Usernames must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    try {
      await changeUsername(trimmed);
      await refresh();
      router.back();
    } catch (submitError) {
      showAlert('Could not change username', isBffError(submitError) ? submitError.message : 'Try again.');
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SettingsHeader title="Username" />
      <ThemedView style={styles.container}>
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton
          title={submitting ? 'Saving…' : 'Save'}
          onPress={handleSave}
          loading={submitting}
          disabled={submitting || unchanged}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    gap: Spacing.three,
    padding: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
});
