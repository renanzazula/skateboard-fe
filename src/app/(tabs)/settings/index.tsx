import { router } from 'expo-router';
import { Bell, Database, Globe, Info, LogOut, Shield, User, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { ProfileCard } from '@/features/settings/components/ProfileCard';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow, type SettingsRowTrailing } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { LANGUAGE_FLAGS, LANGUAGE_LABELS, LANGUAGES, useLocalSettings, type LanguageCode } from '@/features/settings/hooks/useLocalSettings';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { showAlert } from '@/shared/utils/alert';

type HomeRow = {
  key: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: SettingsRowTrailing;
  onPress?: () => void;
  variant?: 'default' | 'destructive';
};

type HomeSection = {
  key: string;
  label?: string;
  tone?: 'default' | 'danger';
  rows: HomeRow[];
};

function LanguageModal({
  visible,
  language,
  onClose,
  onSelect,
}: {
  visible: boolean;
  language: LanguageCode;
  onClose: () => void;
  onSelect: (language: LanguageCode) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <ThemedView style={styles.modalBackdrop}>
        <ThemedView type="surface" style={styles.modalCard}>
          <ThemedText type="subtitle">Language</ThemedText>
          {LANGUAGES.map((option) => (
            <Pressable key={option} onPress={() => onSelect(option)} style={styles.optionRow}>
              <ThemedText type="smallBold" themeColor={language === option ? 'primary' : 'textPrimary'}>
                {language === option ? '✓ ' : '   '}
                {LANGUAGE_FLAGS[option]}  {LANGUAGE_LABELS[option]}
              </ThemedText>
            </Pressable>
          ))}
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

export default function SettingsScreen() {
  const { logout, hasAuthority } = useAuth();
  const { profile } = useProfile();
  const { language, selectLanguage } = useLocalSettings();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const canAccessAdministration =
    hasAuthority('FUNC_TAB_SETTINGS_BRANDING') ||
    hasAuthority('FUNC_HOME_CATEGORY_CONFIG') ||
    hasAuthority('FUNC_PODCAST_IMPORT_JSON') ||
    hasAuthority('FUNC_PODCAST_MANAGE_CATEGORIES');

  const selectLanguageAndClose = useCallback(
    (next: LanguageCode) => {
      selectLanguage(next);
      setLanguageModalVisible(false);
    },
    [selectLanguage]
  );

  const handleLogout = useCallback(() => {
    showAlert('Log out', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  // Grouped rather than one flat list: each group is its own card, so the
  // screen reads as sections instead of an undifferentiated run of rows.
  const sections: HomeSection[] = [
    {
      key: 'account',
      label: 'Account',
      rows: [
        {
          key: 'account',
          icon: User,
          title: 'Your account',
          subtitle: 'Password, deactivate, delete',
          onPress: () => router.push('/settings/account'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'notifications',
          icon: Bell,
          title: 'Notifications',
          subtitle: 'Push & new podcast alerts',
          onPress: () => router.push('/settings/notifications'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'data-storage',
          icon: Database,
          title: 'Data & storage',
          subtitle: 'Cache, downloads, usage',
          onPress: () => router.push('/settings/data-storage'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'language',
          icon: Globe,
          title: 'Language',
          onPress: () => setLanguageModalVisible(true),
          trailing: {
            type: 'value',
            text: `${LANGUAGE_FLAGS[language]}  ${LANGUAGE_LABELS[language]}`,
            tone: 'accent',
            chevron: true,
          },
        },
      ],
    },
    ...(canAccessAdministration
      ? [
          {
            key: 'admin',
            label: 'Admin configuration',
            rows: [
              {
                key: 'administration',
                icon: Shield,
                title: 'Administration',
                subtitle: 'Branding, categories, sync',
                onPress: () => router.push('/settings/administration'),
                trailing: { type: 'chevron' as const },
              },
            ],
          },
        ]
      : []),
    {
      key: 'about',
      label: 'About',
      rows: [
        {
          key: 'about',
          icon: Info,
          title: 'About',
          subtitle: 'Version, legal, support',
          onPress: () => router.push('/settings/about'),
          trailing: { type: 'chevron' },
        },
      ],
    },
    {
      key: 'session',
      tone: 'danger',
      rows: [
        {
          key: 'log-out',
          icon: LogOut,
          title: 'Log out',
          onPress: handleLogout,
          variant: 'destructive',
          trailing: { type: 'none' },
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="Settings" handle={profile?.username ? `@${profile.username}` : undefined} showBack={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileCard />

        <ThemedView style={styles.rows}>
          {sections.map((section) => (
            <SettingsSection key={section.key} label={section.label} tone={section.tone}>
              {section.rows.map((row) => (
                <SettingsRow
                  key={row.key}
                  icon={row.icon}
                  title={row.title}
                  subtitle={row.subtitle}
                  trailing={row.trailing}
                  onPress={row.onPress}
                  variant={row.variant}
                />
              ))}
            </SettingsSection>
          ))}
        </ThemedView>
      </ScrollView>

      <LanguageModal
        visible={languageModalVisible}
        language={language}
        onClose={() => setLanguageModalVisible(false)}
        onSelect={selectLanguageAndClose}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.four,
  },
  rows: {
    paddingHorizontal: Spacing.three,
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
  optionRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: RADII.control,
    paddingVertical: Spacing.three,
  },
});
