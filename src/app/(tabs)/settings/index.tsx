import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AlertCircle,
  AtSign,
  Bell,
  Code,
  Database,
  FileText,
  Flag,
  Globe,
  HelpCircle,
  Image,
  KeyRound,
  LogOut,
  Mic,
  Palette,
  Shield,
  Trash2,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { secureStorage } from '@/core/storage/secureStorage';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { useProfile } from '@/features/account/hooks/useProfile';
import { DeleteAccountDialog } from '@/features/settings/components/DeleteAccountDialog';
import { ProfileHero } from '@/features/settings/components/ProfileHero';
import { SettingsRow, type SettingsRowTrailing } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { isBffError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { showAlert } from '@/shared/utils/alert';

type SettingsItem = {
  key: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: SettingsRowTrailing;
  onPress?: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
};

type SettingsSectionData = {
  title?: string;
  tone?: 'default' | 'danger';
  items: SettingsItem[];
};

type LanguageCode = 'en' | 'es' | 'pt';
type AboutTopic = 'terms' | 'privacy' | 'licenses' | 'support';
type SelectorTopic = 'language';

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

const LANGUAGE_STORAGE_KEY = 'skateboard.settings.language';
const WIFI_ONLY_STORAGE_KEY = 'skateboard.settings.downloadWifiOnly';
const LANGUAGES: LanguageCode[] = ['en', 'es', 'pt'];
const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === 'en' || value === 'es' || value === 'pt';
}

function appVersion() {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'Unknown';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

async function directorySize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    return 0;
  }
  if (!info.isDirectory) {
    return info.size;
  }

  const children = await FileSystem.readDirectoryAsync(uri);
  const childSizes = await Promise.all(children.map((child) => directorySize(`${uri}${uri.endsWith('/') ? '' : '/'}${child}`)));
  return childSizes.reduce((total, size) => total + size, 0);
}

function useLocalSettings() {
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(false);
  const [storageUsage, setStorageUsage] = useState('0 B');
  const [isCalculatingStorage, setIsCalculatingStorage] = useState(true);

  const refreshStorageUsage = useCallback(async () => {
    setIsCalculatingStorage(true);
    const roots = [FileSystem.cacheDirectory, FileSystem.documentDirectory].filter(Boolean) as string[];
    const sizes = await Promise.all(roots.map((root) => directorySize(root).catch(() => 0)));
    setStorageUsage(formatBytes(sizes.reduce((total, size) => total + size, 0)));
    setIsCalculatingStorage(false);
  }, []);

  useEffect(() => {
    (async () => {
      const [storedLanguage, storedDownloadWifiOnly] = await Promise.all([
        secureStorage.getItem(LANGUAGE_STORAGE_KEY),
        secureStorage.getItem(WIFI_ONLY_STORAGE_KEY),
      ]);

      if (isLanguageCode(storedLanguage)) {
        setLanguage(storedLanguage);
      }
      setDownloadWifiOnly(storedDownloadWifiOnly === 'true');
      await refreshStorageUsage();
    })();
  }, [refreshStorageUsage]);

  const selectLanguage = useCallback((next: LanguageCode) => {
    setLanguage(next);
    secureStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleDownloadWifiOnly = useCallback((next: boolean) => {
    setDownloadWifiOnly(next);
    secureStorage.setItem(WIFI_ONLY_STORAGE_KEY, String(next)).catch(() => {});
  }, []);

  const clearCache = useCallback(async () => {
    if (!FileSystem.cacheDirectory) {
      Alert.alert('Clear cache', 'No cache directory is available on this platform.');
      return;
    }

    Alert.alert('Clear cache', 'Clear local cached files? Backend user data will not be changed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const entries = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory!).catch(() => []);
          await Promise.all(
            entries.map((entry) =>
              FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${entry}`, { idempotent: true }).catch(() => undefined)
            )
          );
          await refreshStorageUsage();
        },
      },
    ]);
  }, [refreshStorageUsage]);

  return {
    language,
    downloadWifiOnly,
    storageUsage,
    isCalculatingStorage,
    selectLanguage,
    toggleDownloadWifiOnly,
    clearCache,
  };
}

function SettingsSectionView({ section }: { section: SettingsSectionData }) {
  return (
    <SettingsSection label={section.title} tone={section.tone}>
      {section.items.map((item) => (
        <SettingsRow
          key={item.key}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          trailing={item.trailing}
          onPress={item.onPress}
          variant={item.variant}
          disabled={item.disabled}
        />
      ))}
    </SettingsSection>
  );
}

function SelectorModal({
  topic,
  language,
  onClose,
  onSelectLanguage,
}: {
  topic: SelectorTopic | null;
  language: LanguageCode;
  onClose: () => void;
  onSelectLanguage: (language: LanguageCode) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={topic !== null} onRequestClose={onClose}>
      <ThemedView style={styles.modalBackdrop}>
        <ThemedView type="surface" style={styles.modalCard}>
          <ThemedText type="subtitle">Language</ThemedText>
          {LANGUAGES.map((option) => (
            <Pressable key={option} onPress={() => onSelectLanguage(option)} style={styles.optionRow}>
              <ThemedText type="smallBold" themeColor={language === option ? 'primary' : 'textPrimary'}>
                {language === option ? '✓ ' : '   '}
                {LANGUAGE_LABELS[option]}
              </ThemedText>
            </Pressable>
          ))}
          <ModalCloseButton onPress={onClose} />
        </ThemedView>
      </ThemedView>
    </Modal>
  );
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
          <ModalCloseButton onPress={onClose} />
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function ModalCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold" themeColor="primary">
        Close
      </ThemedText>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { logout, hasAuthority } = useAuth();
  const canManageBranding = hasAuthority('FUNC_TAB_SETTINGS_BRANDING');
  const { profile } = useProfile();
  const {
    language,
    downloadWifiOnly,
    storageUsage,
    isCalculatingStorage,
    selectLanguage,
    toggleDownloadWifiOnly,
    clearCache,
  } = useLocalSettings();
  const { deactivateAccount, deleteAccount, submitting: accountActionSubmitting } = useAccountActions();
  const { preferences: notificationPreferences, setPushEnabled, setNewPodcastEnabled } = useNotificationPreferences();
  const [aboutTopic, setAboutTopic] = useState<AboutTopic | null>(null);
  const [selectorTopic, setSelectorTopic] = useState<SelectorTopic | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const selectLanguageAndClose = useCallback(
    (next: LanguageCode) => {
      selectLanguage(next);
      setSelectorTopic(null);
    },
    [selectLanguage]
  );

  const handleLogout = useCallback(() => {
    showAlert('Log out', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  const handleDeactivate = useCallback(() => {
    showAlert(
      'Deactivate account',
      'Deactivation will temporarily disable your account and sign you out. You can contact support to reactivate it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateAccount();
              await logout();
            } catch (deactivateError) {
              showAlert('Could not deactivate account', isBffError(deactivateError) ? deactivateError.message : 'Try again.');
            }
          },
        },
      ]
    );
  }, [deactivateAccount, logout]);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteAccount();
      setDeleteDialogVisible(false);
      await logout();
    } catch (deleteError) {
      showAlert('Could not delete account', isBffError(deleteError) ? deleteError.message : 'Try again.');
    }
  }, [deleteAccount, logout]);

  const sections: SettingsSectionData[] = [
    {
      title: 'Account',
      items: [
        {
          key: 'username',
          title: 'Username',
          icon: AtSign,
          subtitle: 'Change your username',
          onPress: () => router.push('/settings/username'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'profile-picture',
          title: 'Profile picture',
          icon: Image,
          subtitle: 'Change your avatar',
          onPress: () => router.push('/settings/profile-picture'),
          trailing: { type: 'chevron' },
        },
        {
          key: 'change-password',
          title: 'Change password',
          icon: KeyRound,
          subtitle: 'Manage your account password',
          onPress: () => router.push('/settings/change-password'),
          trailing: { type: 'chevron' },
        },
        { key: 'log-out', title: 'Log out', icon: LogOut, onPress: handleLogout },
      ],
    },
    {
      title: 'App Preferences',
      items: [
        {
          key: 'language',
          title: 'Language',
          icon: Globe,
          onPress: () => setSelectorTopic('language'),
          trailing: { type: 'value', text: LANGUAGE_LABELS[language], tone: 'accent', chevron: true },
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          key: 'push-notifications',
          title: 'Push notifications',
          icon: Bell,
          subtitle: 'Receive notifications',
          trailing: { type: 'switch', value: notificationPreferences?.pushEnabled ?? false, onChange: setPushEnabled },
        },
        {
          key: 'new-podcasts',
          title: 'New podcasts',
          icon: Mic,
          subtitle: 'Notify me when a new podcast is published',
          trailing: { type: 'switch', value: notificationPreferences?.newPodcastEnabled ?? false, onChange: setNewPodcastEnabled },
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          key: 'clear-cache',
          title: 'Clear cache',
          icon: Trash2,
          onPress: clearCache,
          trailing: { type: 'value', text: `Free ${storageUsage}`, loading: isCalculatingStorage, chevron: true },
        },
        {
          key: 'wifi-only',
          title: 'Download over Wi‑Fi only',
          icon: Wifi,
          trailing: { type: 'switch', value: downloadWifiOnly, onChange: toggleDownloadWifiOnly },
        },
        {
          key: 'storage-usage',
          title: 'Storage usage',
          icon: Database,
          trailing: { type: 'value', text: storageUsage, loading: isCalculatingStorage, chevron: true },
        },
      ],
    },
    {
      title: 'About',
      items: [
        { key: 'app-version', title: 'App version', icon: Code, trailing: { type: 'value', text: appVersion() } },
        { key: 'terms', title: 'Terms & Conditions', icon: FileText, onPress: () => setAboutTopic('terms'), trailing: { type: 'chevron' } },
        { key: 'privacy', title: 'Privacy Policy', icon: Shield, onPress: () => setAboutTopic('privacy'), trailing: { type: 'chevron' } },
        { key: 'licenses', title: 'Open-source licenses', icon: Code, onPress: () => setAboutTopic('licenses'), trailing: { type: 'chevron' } },
        { key: 'support', title: 'Contact / Support', icon: HelpCircle, onPress: () => setAboutTopic('support'), trailing: { type: 'chevron' } },
        { key: 'report', title: 'Report a problem', icon: Flag, disabled: true, trailing: { type: 'chevron' } },
      ],
    },
    ...(canManageBranding
      ? [
          {
            title: 'Administration',
            items: [
              {
                key: 'branding',
                title: 'Branding',
                icon: Palette,
                subtitle: 'Manage login background, app logo & assets',
                onPress: () => router.push('/settings/branding'),
                trailing: { type: 'chevron' as const },
              },
            ],
          },
        ]
      : []),
    {
      title: 'Danger Zone',
      tone: 'danger',
      items: [
        {
          key: 'deactivate',
          title: 'Deactivate account',
          icon: AlertCircle,
          subtitle: 'Temporarily disable your account',
          onPress: handleDeactivate,
          variant: 'destructive',
          trailing: { type: 'chevron' },
        },
        {
          key: 'delete',
          title: 'Delete account',
          icon: Trash2,
          subtitle: 'Permanently delete your account',
          onPress: () => setDeleteDialogVisible(true),
          variant: 'destructive',
          trailing: { type: 'chevron' },
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Settings
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Manage your account and preferences.
            </ThemedText>
          </View>

          <ProfileHero />

          {sections.map((section) => (
            <SettingsSectionView key={section.title} section={section} />
          ))}
        </ScrollView>
      </SafeAreaView>

      <SelectorModal
        topic={selectorTopic}
        language={language}
        onClose={() => setSelectorTopic(null)}
        onSelectLanguage={selectLanguageAndClose}
      />
      <AboutModal topic={aboutTopic} onClose={() => setAboutTopic(null)} />
      <DeleteAccountDialog
        visible={deleteDialogVisible}
        username={profile?.username ?? null}
        submitting={accountActionSubmitting}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
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
  pressed: {
    opacity: 0.7,
  },
});
