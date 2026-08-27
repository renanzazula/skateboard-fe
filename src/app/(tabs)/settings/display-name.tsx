import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';
import { showAlert } from '@/shared/utils/alert';

/**
 * Reached from the Display name row on Settings → Your account.
 *
 * updateDisplayName has existed in useProfile since the hook was written and
 * no screen ever called it, so PATCH /api/me — whose request body carries this
 * one field and nothing else — was unreachable from the app. This is the
 * screen that reaches it.
 */
export default function DisplayNameScreen() {
  const { profile, refresh, updateDisplayName } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [saving, setSaving] = useState(false);

  const trimmed = displayName.trim();
  const unchanged = trimmed === (profile?.displayName ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      await refresh();
      router.back();
    } catch (submitError) {
      showAlert('Could not save display name', isBffError(submitError) ? submitError.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SettingsHeader title="Display name" />
      <ThemedView style={styles.container}>
        <TextField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How your name appears in the app"
          autoCapitalize="words"
        />
        <PrimaryButton
          title={saving ? 'Saving…' : 'Save'}
          onPress={handleSave}
          loading={saving}
          disabled={saving || unchanged}
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
