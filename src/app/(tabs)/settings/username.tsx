import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';
import { isBffError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
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
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.container}>
        <ThemedText type="small">Username</ThemedText>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Your username"
          placeholderTextColor={theme.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <ThemedText type="small" themeColor="textDim">
          This is coordinated with your sign-in identity — you may need to log in again after changing it.
        </ThemedText>

        <Pressable disabled={submitting} onPress={handleSave}>
          <ThemedView type={submitting ? 'surface' : 'accent'} style={styles.submitButton}>
            <ThemedText type="smallBold" themeColor={submitting ? 'textFaint' : 'onAccent'}>
              {submitting ? 'Saving…' : 'Save'}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  submitButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
    alignItems: 'center',
  },
});
