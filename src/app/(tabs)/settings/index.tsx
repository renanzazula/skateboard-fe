import { router } from 'expo-router';
import { Bell, Database, Globe, Info, LogOut, Shield, User, type LucideIcon } from 'lucide-react-native';
import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { ProfileCard } from '@/features/settings/components/ProfileCard';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow, type SettingsRowTrailing } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { LANGUAGE_FLAGS, LANGUAGE_LABELS, useLocalSettings } from '@/features/settings/hooks/useLocalSettings';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
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

export default function SettingsScreen() {
  const { logout, hasAuthority } = useAuth();
  const { profile } = useProfile();
  const { language } = useLocalSettings();
  const { t } = useTranslation();

  const canAccessAdministration =
    hasAuthority('FUNC_TAB_SETTINGS_BRANDING') ||
    hasAuthority('FUNC_HOME_CATEGORY_CONFIG') ||
    hasAuthority('FUNC_PODCAST_IMPORT_JSON') ||
    hasAuthority('FUNC_PODCAST_MANAGE_CATEGORIES');


  const handleLogout = useCallback(() => {
    showAlert(t('settings.logOut'), t('settings.logOutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logOut'), style: 'destructive', onPress: logout },
    ]);
  }, [logout, t]);

  // Grouped rather than one flat list: each group is its own card, so the
  // screen reads as sections instead of an undifferentiated run of rows.
  const sections: HomeSection[] = [
    {
      key: 'account',
      label: t('settings.sectionAccount'),
      rows: [
        {
          key: 'account',
          icon: User,
          title: t('settings.yourAccount'),
          subtitle: t('settings.yourAccountSubtitle'),
          onPress: () => router.push('/settings/account'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'notifications',
          icon: Bell,
          title: t('settings.notifications'),
          subtitle: t('settings.notificationsSubtitle'),
          onPress: () => router.push('/settings/notifications'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'data-storage',
          icon: Database,
          title: t('settings.dataStorage'),
          subtitle: t('settings.dataStorageSubtitle'),
          onPress: () => router.push('/settings/data-storage'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'language',
          icon: Globe,
          title: t('settings.language'),
          onPress: () => router.push('/settings/language'),
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
            label: t('settings.sectionAdmin'),
            rows: [
              {
                key: 'administration',
                icon: Shield,
                title: t('settings.administration'),
                subtitle: t('settings.administrationSubtitle'),
                onPress: () => router.push('/settings/administration'),
                trailing: { type: 'chevron' as const },
              },
            ],
          },
        ]
      : []),
    {
      key: 'about',
      label: t('settings.sectionAbout'),
      rows: [
        {
          key: 'about',
          icon: Info,
          title: t('settings.about'),
          subtitle: t('settings.aboutSubtitle'),
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
          title: t('settings.logOut'),
          onPress: handleLogout,
          variant: 'destructive',
          trailing: { type: 'none' },
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('settings.title')} handle={profile?.username ? `@${profile.username}` : undefined} showBack={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileCard onPress={() => router.push('/settings/account')} />

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
});
