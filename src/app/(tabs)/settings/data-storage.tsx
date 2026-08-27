import { Database, Trash2, Wifi } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { useLocalSettings } from '@/features/settings/hooks/useLocalSettings';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function DataStorageScreen() {
  const { profile } = useProfile();
  const { downloadWifiOnly, storageUsage, isCalculatingStorage, toggleDownloadWifiOnly, clearCache } = useLocalSettings();
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.dataStorage')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection label={t('settings.storage')}>
          <SettingsRow
            icon={Trash2}
            title={t('settings.clearCache')}
            onPress={clearCache}
            trailing={{
              type: 'value',
              text: t('settings.freeSpace', { size: storageUsage }),
              loading: isCalculatingStorage,
              chevron: true,
            }}
          />
          <SettingsRow
            icon={Wifi}
            title={t('settings.downloadWifiOnly')}
            trailing={{ type: 'switch', value: downloadWifiOnly, onChange: toggleDownloadWifiOnly }}
          />
          <SettingsRow
            icon={Database}
            title={t('settings.storageUsage')}
            trailing={{ type: 'value', text: storageUsage, loading: isCalculatingStorage }}
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
