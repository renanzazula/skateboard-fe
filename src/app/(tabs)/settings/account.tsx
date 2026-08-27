import { router } from 'expo-router';
import { AlertCircle, KeyRound, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';
import { DeleteAccountDialog } from '@/features/settings/components/DeleteAccountDialog';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { isBffError } from '@/shared/api/errors';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { showAlert } from '@/shared/utils/alert';

/** Month and year, or null when the API sent nothing parseable. */
function formatMemberSince(createdAt: string | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

export default function AccountScreen() {
  const { logout, email } = useAuth();
  const { profile, isLoading } = useProfile();
  const { deactivateAccount, deleteAccount, submitting } = useAccountActions();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const memberSince = formatMemberSince(profile?.createdAt);
  // Only worth a row when it isn't the normal case: printing "Active" to
  // everyone is noise, while saying nothing on a deactivated account hides
  // the one thing that matters.
  const accountStatus =
    profile?.status && profile.status !== 'ACTIVE'
      ? profile.status.charAt(0) + profile.status.slice(1).toLowerCase()
      : null;

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
        {/* One value per row, tap to change. Email and Member since carry no
            chevron: neither can be changed here — email comes from the
            identity provider and no endpoint touches it — and a chevron onto a
            dead end is a small lie. */}
        <SettingsSection label="Profile" dividerInset="edge">
          <SettingsRow
            key="username"
            title="Username"
            onPress={() => router.push('/settings/username')}
            trailing={{ type: 'value', text: profile?.username ? `@${profile.username}` : 'Add', chevron: true, loading: isLoading }}
          />
          <SettingsRow
            key="display-name"
            title="Display name"
            onPress={() => router.push('/settings/display-name')}
            trailing={{ type: 'value', text: profile?.displayName || 'Add', chevron: true, loading: isLoading }}
          />
          <SettingsRow key="email" title="Email" trailing={{ type: 'value', text: email ?? 'None' }} />
          {memberSince ? (
            <SettingsRow key="since" title="Member since" trailing={{ type: 'value', text: memberSince }} />
          ) : null}
          {accountStatus ? (
            <SettingsRow key="status" title="Status" variant="destructive" trailing={{ type: 'value', text: accountStatus }} />
          ) : null}
        </SettingsSection>

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
});
