import Constants from 'expo-constants';
import { Code, FileText, Flag, HelpCircle, Shield } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

type AboutTopic = 'terms' | 'privacy' | 'licenses' | 'support';

const ABOUT_TOPIC_KEYS = {
  terms: { title: 'settings.termsTitle', body: 'settings.termsBody' },
  privacy: { title: 'settings.privacyTitle', body: 'settings.privacyBody' },
  licenses: { title: 'settings.licensesTitle', body: 'settings.licensesBody' },
  support: { title: 'settings.supportTitle', body: 'settings.supportBody' },
} as const satisfies Record<AboutTopic, { title: string; body: string }>;

function appVersion(unknown: string) {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? unknown;
}

function AboutModal({ topic, onClose }: { topic: AboutTopic | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal animationType="slide" transparent visible={topic !== null} onRequestClose={onClose}>
      <ThemedView style={styles.modalBackdrop}>
        <ThemedView type="surface" style={styles.modalCard}>
          {topic ? (
            <>
              <ThemedText type="subtitle">{t(ABOUT_TOPIC_KEYS[topic].title)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t(ABOUT_TOPIC_KEYS[topic].body)}
              </ThemedText>
            </>
          ) : null}
          <Pressable onPress={onClose} style={styles.closeButton}>
            <ThemedText type="smallBold" themeColor="primary">
              {t('common.close')}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

export default function AboutScreen() {
  const { profile } = useProfile();
  const { t } = useTranslation();
  const [topic, setTopic] = useState<AboutTopic | null>(null);

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.about')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection label={t('settings.app')}>
          <SettingsRow
            icon={Code}
            title={t('settings.appVersion')}
            trailing={{ type: 'value', text: appVersion(t('settings.unknownVersion')) }}
          />
        </SettingsSection>

        <SettingsSection label={t('settings.legal')}>
          <SettingsRow icon={FileText} title={t('settings.termsTitle')} onPress={() => setTopic('terms')} trailing={{ type: 'chevron' }} />
          <SettingsRow icon={Shield} title={t('settings.privacyTitle')} onPress={() => setTopic('privacy')} trailing={{ type: 'chevron' }} />
          <SettingsRow icon={Code} title={t('settings.licensesTitle')} onPress={() => setTopic('licenses')} trailing={{ type: 'chevron' }} />
        </SettingsSection>

        <SettingsSection label={t('settings.support')}>
          <SettingsRow icon={HelpCircle} title={t('settings.contactSupport')} onPress={() => setTopic('support')} trailing={{ type: 'chevron' }} />
          <SettingsRow icon={Flag} title={t('settings.reportProblem')} disabled trailing={{ type: 'chevron' }} />
        </SettingsSection>
      </ScrollView>

      <AboutModal topic={topic} onClose={() => setTopic(null)} />
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
  },
  modalCard: {
    borderRadius: RADII.card,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: RADII.control,
    paddingVertical: Spacing.three,
  },
});
