import { Bell, Mic } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet } from 'react-native';

import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import {
  getPushPermissionState,
  registerPushDevice,
  type PushPermissionState,
} from '@/features/notifications';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function NotificationsScreen() {
  const { profile } = useProfile();
  const { preferences, setPushEnabled, setNewPodcastEnabled } = useNotificationPreferences();
  const { t } = useTranslation();

  // These switches are an app-level preference; the OS has its own, and it
  // wins. Without this a user who denied the system prompt sees both switches
  // on, receives nothing, and has no way to tell why.
  const [permission, setPermission] = useState<PushPermissionState | null>(null);

  const refreshPermission = useCallback(() => {
    // Read-only: opening this screen must not spend the one prompt iOS ever
    // gives us. Asking happens when the user turns push on, below.
    getPushPermissionState().then(setPermission);
  }, []);

  useEffect(refreshPermission, [refreshPermission]);

  // Changing the OS setting means leaving the app and coming back, and it
  // fires no event of its own — so re-read on foreground, or the hint below
  // keeps claiming notifications are blocked after the user has allowed them.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  /**
   * Turning push on has to do more than set the server flag. The device may
   * never have registered — permission declined at sign-in, or the backend was
   * down — and without this the user flips the switch, sees it on, and still
   * receives nothing.
   */
  const handlePushEnabledChange = useCallback(
    async (enabled: boolean) => {
      await setPushEnabled(enabled);
      if (enabled) {
        await registerPushDevice();
        refreshPermission();
      }
    },
    [setPushEnabled, refreshPermission]
  );

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.notifications')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {permission === 'denied' && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.blockedHint}>
            {t('settings.notificationsBlocked')}
          </ThemedText>
        )}
        <SettingsSection label={t('settings.alerts')}>
          <SettingsRow
            icon={Bell}
            title={t('settings.pushNotifications')}
            subtitle={t('settings.pushNotificationsSubtitle')}
            trailing={{
              type: 'switch',
              value: preferences?.pushEnabled ?? false,
              onChange: handlePushEnabledChange,
            }}
          />
          <SettingsRow
            icon={Mic}
            title={t('settings.newPodcasts')}
            subtitle={t('settings.newPodcastsSubtitle')}
            trailing={{ type: 'switch', value: preferences?.newPodcastEnabled ?? false, onChange: setNewPodcastEnabled }}
          />
        </SettingsSection>
      </ScrollView>
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
  blockedHint: {
    paddingBottom: Spacing.two,
  },
});
