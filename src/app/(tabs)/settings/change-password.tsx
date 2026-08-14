import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { isBffError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const { changePassword, submitting } = useAccountActions();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = async () => {
    if (newPassword.length < 8) {
      showAlert('Password too short', 'Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match', 'Re-enter your new password to confirm.');
      return;
    }
    try {
      await changePassword(newPassword);
      showAlert('Password changed', 'Your password has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (submitError) {
      showAlert('Could not change password', isBffError(submitError) ? submitError.message : 'Try again.');
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.container}>
        <ThemedText type="small">New password</ThemedText>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 8 characters"
          placeholderTextColor={theme.textFaint}
          secureTextEntry
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />

        <ThemedText type="small">Confirm new password</ThemedText>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your new password"
          placeholderTextColor={theme.textFaint}
          secureTextEntry
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />

        <Pressable disabled={submitting} onPress={handleSave}>
          <ThemedView type={submitting ? 'surface' : 'accent'} style={styles.submitButton}>
            <ThemedText type="smallBold" themeColor={submitting ? 'textFaint' : 'onAccent'}>
              {submitting ? 'Saving…' : 'Change password'}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
