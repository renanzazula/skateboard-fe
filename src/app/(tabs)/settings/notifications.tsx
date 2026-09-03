import { Bell, Mic } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import { requestPushPermission, type PushPermissionState } from '@/features/notifications';
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
  // wins. Without this hint a user who denied the system prompt sees both
  // switches on, receives nothing, and has no way to tell why.
  const [permission, setPermission] = useState<PushPermissionState | null>(null);
  useEffect(() => {
    requestPushPermission().then(setPermission);
  }, []);

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
            trailing={{ type: 'switch', value: preferences?.pushEnabled ?? false, onChange: setPushEnabled }}
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
