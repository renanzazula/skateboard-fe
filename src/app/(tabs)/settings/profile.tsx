import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, isLoading, updateDisplayName } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await updateDisplayName(displayName.trim());
      router.back();
    } catch (submitError) {
      showAlert('Could not update profile', isBffError(submitError) ? submitError.message : 'Try again.');
    } finally {
      setSubmitting(false);
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
        <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your display name" />
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
