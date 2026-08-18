import { Bell, Mic } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

export default function NotificationsScreen() {
  const { profile } = useProfile();
  const { preferences, setPushEnabled, setNewPodcastEnabled } = useNotificationPreferences();

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="Notifications" handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsRow
          icon={Bell}
          title="Push notifications"
          subtitle="Receive notifications"
          trailing={{ type: 'switch', value: preferences?.pushEnabled ?? false, onChange: setPushEnabled }}
        />
        <SettingsRow
          icon={Mic}
          title="New podcasts"
          subtitle="Notify me when a new podcast is published"
          trailing={{ type: 'switch', value: preferences?.newPodcastEnabled ?? false, onChange: setNewPodcastEnabled }}
        />
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
