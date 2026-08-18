import Constants from 'expo-constants';
import { Code, FileText, Flag, HelpCircle, Shield } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';

type AboutTopic = 'terms' | 'privacy' | 'licenses' | 'support';

const ABOUT_CONTENT: Record<AboutTopic, { title: string; body: string }> = {
  terms: {
    title: 'Terms & Conditions',
    body:
      'These mobile terms are pending final legal copy. Until then, use Skateboard responsibly, respect other users, and follow the platform rules provided by Skateboard.',
  },
  privacy: {
    title: 'Privacy Policy',
    body:
      'The final privacy policy is pending. This app should only collect data needed for authentication, profile features, preferences, notifications, support, and normal app operation.',
  },
  licenses: {
    title: 'Open-source licenses',
    body:
      'Open-source license details will be generated from the production dependency list before release. Current major dependencies include Expo, React, React Native, Expo Router, and openapi-fetch.',
  },
  support: {
    title: 'Contact / Support',
    body: 'Support contact information is not configured yet. For now, contact the Skateboard team through the project-maintained support channel.',
  },
};

function appVersion() {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'Unknown';
}

function AboutModal({ topic, onClose }: { topic: AboutTopic | null; onClose: () => void }) {
  return (
    <Modal animationType="slide" transparent visible={topic !== null} onRequestClose={onClose}>
      <ThemedView style={styles.modalBackdrop}>
        <ThemedView type="surface" style={styles.modalCard}>
          {topic ? (
            <>
              <ThemedText type="subtitle">{ABOUT_CONTENT[topic].title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {ABOUT_CONTENT[topic].body}
              </ThemedText>
            </>
          ) : null}
          <Pressable onPress={onClose} style={styles.closeButton}>
            <ThemedText type="smallBold" themeColor="primary">
              Close
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

export default function AboutScreen() {
  const { profile } = useProfile();
  const [topic, setTopic] = useState<AboutTopic | null>(null);

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="About" handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsRow icon={Code} title="App version" trailing={{ type: 'value', text: appVersion() }} />
        <SettingsRow icon={FileText} title="Terms & Conditions" onPress={() => setTopic('terms')} trailing={{ type: 'chevron' }} />
        <SettingsRow icon={Shield} title="Privacy Policy" onPress={() => setTopic('privacy')} trailing={{ type: 'chevron' }} />
        <SettingsRow icon={Code} title="Open-source licenses" onPress={() => setTopic('licenses')} trailing={{ type: 'chevron' }} />
        <SettingsRow icon={HelpCircle} title="Contact & support" onPress={() => setTopic('support')} trailing={{ type: 'chevron' }} />
        <SettingsRow icon={Flag} title="Report a problem" disabled trailing={{ type: 'chevron' }} />
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
