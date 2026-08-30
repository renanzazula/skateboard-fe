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
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

const MIN_LENGTH = 3;

/** Reached from the Username row on Settings → Your account. Same shape as change-password.tsx. */
export default function UsernameScreen() {
  const { profile, refresh } = useProfile();
  const { changeUsername, submitting } = useAccountActions();
  const { t } = useTranslation();
  const [username, setUsername] = useState(profile?.username ?? '');

  const trimmed = username.trim();
  const unchanged = trimmed === (profile?.username ?? '');

  const handleSave = async () => {
    if (trimmed.length < MIN_LENGTH) {
      showAlert(t('settings.usernameTooShortTitle'), t('settings.usernameMinLength', { min: MIN_LENGTH }));
      return;
    }
    try {
      await changeUsername(trimmed);
      await refresh();
      router.back();
    } catch (submitError) {
      showAlert(t('settings.usernameChangeError'), isBffError(submitError) ? submitError.message : t('common.tryAgain'));
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SettingsHeader title={t('settings.username')} />
      <ThemedView style={styles.container}>
        <TextField
          label={t('settings.username')}
          value={username}
          onChangeText={setUsername}
          placeholder={t('settings.usernamePlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton
          title={submitting ? t('common.saving') : t('common.save')}
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
