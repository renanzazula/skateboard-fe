import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';
import { showAlert } from '@/shared/utils/alert';

export default function ChangePasswordScreen() {
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
        <TextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 8 characters"
          secureTextEntry
        />
        <TextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your new password"
          secureTextEntry
        />

        <PrimaryButton
          title={submitting ? 'Saving…' : 'Change password'}
          onPress={handleSave}
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
    gap: Spacing.three,
    padding: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
});
