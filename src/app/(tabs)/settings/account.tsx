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
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

/** Month and year in the given locale, or null when the API sent nothing parseable. */
function formatMemberSince(createdAt: string | undefined, locale: string): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}

export default function AccountScreen() {
  const { logout, email } = useAuth();
  const { profile, isLoading } = useProfile();
  const { deactivateAccount, deleteAccount, submitting } = useAccountActions();
  const { t, language } = useTranslation();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const memberSince = formatMemberSince(profile?.createdAt, language);
  // Only worth a row when it isn't the normal case: printing "Active" to
  // everyone is noise, while saying nothing on a deactivated account hides
  // the one thing that matters.
  const accountStatus =
    profile?.status === 'DEACTIVATED'
      ? t('settings.statusDeactivated')
      : profile?.status === 'DELETED'
        ? t('settings.statusDeleted')
        : null;

  const handleDeactivate = useCallback(() => {
    showAlert(t('settings.deactivateAccount'), t('settings.deactivateConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deactivate'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deactivateAccount();
            await logout();
          } catch (deactivateError) {
            showAlert(
              t('settings.deactivateError'),
              isBffError(deactivateError) ? deactivateError.message : t('common.tryAgain')
            );
          }
        },
      },
    ]);
  }, [deactivateAccount, logout, t]);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteAccount();
      setDeleteDialogVisible(false);
      await logout();
    } catch (deleteError) {
      showAlert(t('settings.deleteError'), isBffError(deleteError) ? deleteError.message : t('common.tryAgain'));
    }
  }, [deleteAccount, logout, t]);

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.yourAccount')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* One value per row, tap to change. Email and Member since carry no
            chevron: neither can be changed here — email comes from the
            identity provider and no endpoint touches it — and a chevron onto a
            dead end is a small lie. */}
        <SettingsSection label={t('settings.profile')} dividerInset="edge">
          <SettingsRow
            key="username"
            title={t('settings.username')}
            onPress={() => router.push('/settings/username')}
            trailing={{
              type: 'value',
              text: profile?.username ? `@${profile.username}` : t('common.add'),
              chevron: true,
              loading: isLoading,
            }}
          />
          <SettingsRow
            key="display-name"
            title={t('settings.displayName')}
            onPress={() => router.push('/settings/display-name')}
            trailing={{ type: 'value', text: profile?.displayName || t('common.add'), chevron: true, loading: isLoading }}
          />
          <SettingsRow key="email" title={t('settings.email')} trailing={{ type: 'value', text: email ?? t('settings.none') }} />
          {memberSince ? (
            <SettingsRow key="since" title={t('settings.memberSince')} trailing={{ type: 'value', text: memberSince }} />
          ) : null}
          {accountStatus ? (
            <SettingsRow
              key="status"
              title={t('settings.status')}
              variant="destructive"
              trailing={{ type: 'value', text: accountStatus }}
            />
          ) : null}
        </SettingsSection>

        <SettingsSection label={t('settings.security')}>
          <SettingsRow
            icon={KeyRound}
            title={t('settings.changePassword')}
            subtitle={t('settings.changePasswordSubtitle')}
            onPress={() => router.push('/settings/change-password')}
            trailing={{ type: 'chevron' }}
          />
        </SettingsSection>

        <SettingsSection label={t('settings.dangerZone')} tone="danger">
          <SettingsRow
            key="deactivate"
            icon={AlertCircle}
            title={t('settings.deactivateAccount')}
            subtitle={t('settings.deactivateAccountSubtitle')}
            onPress={handleDeactivate}
            variant="destructive"
            trailing={{ type: 'chevron' }}
          />
          <SettingsRow
            key="delete"
            icon={Trash2}
            title={t('settings.deleteAccount')}
            subtitle={t('settings.deleteAccountSubtitle')}
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
