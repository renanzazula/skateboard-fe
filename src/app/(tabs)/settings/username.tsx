import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

export default function UsernameScreen() {
  const theme = useTheme();
  const { profile, isLoading, refresh } = useProfile();
  const { changeUsername, submitting } = useAccountActions();
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      showAlert('Username too short', 'Usernames must be at least 3 characters.');
      return;
    }
    try {
      await changeUsername(trimmed);
      await refresh();
      router.back();
    } catch (submitError) {
      showAlert('Could not update username', isBffError(submitError) ? submitError.message : 'Try again.');
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.container}>
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Your username"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ThemedText type="small" themeColor="textSecondary">
          This is coordinated with your sign-in identity — you may need to log in again after changing it.
        </ThemedText>

        <PrimaryButton title={submitting ? 'Saving…' : 'Save'} onPress={handleSave} loading={submitting} disabled={submitting} />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    gap: Spacing.three,
    padding: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
});
