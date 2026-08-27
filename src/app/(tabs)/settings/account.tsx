import { router } from 'expo-router';
import { AlertCircle, KeyRound, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';
import { DeleteAccountDialog } from '@/features/settings/components/DeleteAccountDialog';
import { ProfileCard } from '@/features/settings/components/ProfileCard';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { isBffError } from '@/shared/api/errors';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { showAlert } from '@/shared/utils/alert';

export default function AccountScreen() {
  const { logout } = useAuth();
  const { profile } = useProfile();
  const { deactivateAccount, deleteAccount, submitting } = useAccountActions();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const handleDeactivate = useCallback(() => {
    showAlert(
      'Deactivate account',
      'Deactivation will temporarily disable your account and sign you out. You can contact support to reactivate it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateAccount();
              await logout();
            } catch (deactivateError) {
              showAlert('Could not deactivate account', isBffError(deactivateError) ? deactivateError.message : 'Try again.');
            }
          },
        },
      ]
    );
  }, [deactivateAccount, logout]);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteAccount();
      setDeleteDialogVisible(false);
      await logout();
    } catch (deleteError) {
      showAlert('Could not delete account', isBffError(deleteError) ? deleteError.message : 'Try again.');
    }
  }, [deleteAccount, logout]);

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="Your account" handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity first: this is the screen called "Your account", so the
            values it is about belong at the top of it, above the actions
            performed on them. */}
        <ProfileCard style={styles.profile} />

        <SettingsSection label="Security">
          <SettingsRow
            icon={KeyRound}
            title="Change password"
            subtitle="Manage your account password"
            onPress={() => router.push('/settings/change-password')}
            trailing={{ type: 'chevron' }}
          />
        </SettingsSection>

        <SettingsSection label="Danger zone" tone="danger">
          <SettingsRow
            key="deactivate"
            icon={AlertCircle}
            title="Deactivate account"
            subtitle="Temporarily disable your account"
            onPress={handleDeactivate}
            variant="destructive"
            trailing={{ type: 'chevron' }}
          />
          <SettingsRow
            key="delete"
            icon={Trash2}
            title="Delete account"
            subtitle="Permanently delete your account"
            onPress={() => setDeleteDialogVisible(true)}
            variant="destructive"
            trailing={{ type: 'chevron' }}
          />
        </SettingsSection>
      </ScrollView>

      <DeleteAccountDialog
        visible={deleteDialogVisible}
        username={profile?.username ?? null}
        submitting={submitting}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  // The card carries its own screen margins for the Settings home; this
  // screen already pads its scroll content, so drop them rather than inset
  // the card twice.
  profile: {
    marginHorizontal: 0,
  },
});
