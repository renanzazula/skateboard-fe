import { Bell, BellRing, Mic } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet } from 'react-native';

import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import {
  getPushPermissionState,
  registerPushDevice,
  resolveTestNotificationOutcome,
  sendTestNotification,
  type PushPermissionState,
  type TestNotificationOutcome,
} from '@/features/notifications';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { isBffError } from '@/shared/api/errors';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

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

  const [sendingTest, setSendingTest] = useState(false);

  const outcomeMessage = useCallback(
    (outcome: TestNotificationOutcome) => {
      switch (outcome.key) {
        case 'sent':
          return t('settings.testNotificationSent', { count: outcome.count });
        case 'noDevice':
          return t('settings.testNotificationNoDevice');
        case 'expired':
          return t('settings.testNotificationExpired');
        case 'retrying':
          return t('settings.testNotificationRetrying');
        case 'rejected':
          return t('settings.testNotificationRejected');
      }
    },
    [t]
  );

  /**
   * Registers first so the test goes to this handset's current token — a
   * device that never registered, or whose token rotated, would otherwise
   * report "no device" or a dead token for a problem one tap here fixes.
   * A resend of an unchanged registration is skipped by registerPushDevice.
   */
  const handleSendTest = useCallback(async () => {
    setSendingTest(true);
    try {
      await registerPushDevice();
      refreshPermission();
      const outcome = resolveTestNotificationOutcome(await sendTestNotification());
      showAlert(t('settings.testNotificationTitle'), outcomeMessage(outcome));
    } catch (err) {
      showAlert(t('settings.testNotificationError'), isBffError(err) ? err.message : t('common.tryAgain'));
    } finally {
      setSendingTest(false);
    }
  }, [outcomeMessage, refreshPermission, t]);

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.notifications')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {permission === 'denied' && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.blockedHint}>
            {t('settings.notificationsBlocked')}
          </ThemedText>
        )}
        {permission === 'unsupported' && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.blockedHint}>
            {t('settings.notificationsUnsupported')}
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
        {/* Nothing to test where this build cannot hold a push token (web, simulator). */}
        {permission !== null && permission !== 'unsupported' && (
          <SettingsSection label={t('settings.troubleshooting')}>
            <SettingsRow
              icon={BellRing}
              title={t('settings.sendTestNotification')}
              subtitle={t('settings.sendTestNotificationSubtitle')}
              trailing={{ type: 'chevron' }}
              onPress={handleSendTest}
              disabled={sendingTest}
            />
          </SettingsSection>
        )}
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
