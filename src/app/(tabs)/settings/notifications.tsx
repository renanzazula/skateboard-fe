import { Bell, Mic } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function NotificationsScreen() {
  const { profile } = useProfile();
  const { preferences, setPushEnabled, setNewPodcastEnabled } = useNotificationPreferences();
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.notifications')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
});
