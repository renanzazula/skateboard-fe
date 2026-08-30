import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  LANGUAGES,
  useLocalSettings,
  type LanguageCode,
} from '@/features/settings/hooks/useLocalSettings';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

/**
 * Language was the one picker in Settings that opened a bottom sheet while
 * every other row — account, notifications, data & storage, change password —
 * pushes a screen. It pushes a screen now too.
 *
 * Selecting navigates straight back rather than waiting for a Close button:
 * the choice is the whole purpose of the screen, so there is nothing left to
 * do on it once one is made.
 */
export default function LanguageScreen() {
  const { language, selectLanguage } = useLocalSettings();
  const { t } = useTranslation();

  const handleSelect = (next: LanguageCode) => {
    selectLanguage(next);
    router.back();
  };

  return (
    <ThemedView style={styles.screen}>
      <SettingsHeader title={t('settings.language')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection dividerInset="edge">
          {LANGUAGES.map((option) => (
            <SettingsRow
              key={option}
              title={`${LANGUAGE_FLAGS[option]}  ${LANGUAGE_LABELS[option]}`}
              onPress={() => handleSelect(option)}
              trailing={{ type: 'check', checked: option === language }}
            />
          ))}
        </SettingsSection>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
});
