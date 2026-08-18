import { Database, Trash2, Wifi } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { useLocalSettings } from '@/features/settings/hooks/useLocalSettings';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

export default function DataStorageScreen() {
  const { profile } = useProfile();
  const { downloadWifiOnly, storageUsage, isCalculatingStorage, toggleDownloadWifiOnly, clearCache } = useLocalSettings();

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="Data & storage" handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsRow
          icon={Trash2}
          title="Clear cache"
          onPress={clearCache}
          trailing={{ type: 'value', text: `Free ${storageUsage}`, loading: isCalculatingStorage, chevron: true }}
        />
        <SettingsRow
          icon={Wifi}
          title="Download over Wi‑Fi only"
          trailing={{ type: 'switch', value: downloadWifiOnly, onChange: toggleDownloadWifiOnly }}
        />
        <SettingsRow
          icon={Database}
          title="Storage usage"
          trailing={{ type: 'value', text: storageUsage, loading: isCalculatingStorage }}
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
