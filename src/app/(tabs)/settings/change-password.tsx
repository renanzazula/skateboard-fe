import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

export default function ChangePasswordScreen() {
  const { changePassword, submitting } = useAccountActions();
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = async () => {
    if (newPassword.length < 8) {
      showAlert(t('settings.passwordTooShortTitle'), t('settings.passwordTooShortMessage'));
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert(t('settings.passwordMismatchTitle'), t('settings.passwordMismatchMessage'));
      return;
    }
    try {
      await changePassword(newPassword);
      showAlert(t('settings.passwordChangedTitle'), t('settings.passwordChangedMessage'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (submitError) {
      showAlert(t('settings.passwordChangeError'), isBffError(submitError) ? submitError.message : t('common.tryAgain'));
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SettingsHeader title={t('settings.changePassword')} />
      <ThemedView style={styles.container}>
        <TextField
          label={t('settings.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('settings.newPasswordPlaceholder')}
          secureTextEntry
        />
        <TextField
          label={t('settings.confirmNewPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('settings.confirmPasswordPlaceholder')}
          secureTextEntry
        />

        <PrimaryButton
          title={submitting ? t('common.saving') : t('settings.changePassword')}
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
