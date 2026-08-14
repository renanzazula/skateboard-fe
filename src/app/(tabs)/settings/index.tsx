import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AlertCircle,
  AtSign,
  Bell,
  ChevronRight,
  Code,
  Database,
  FileText,
  Globe,
  HelpCircle,
  Image,
  KeyRound,
  LogOut,
  Mic,
  Moon,
  Shield,
  Trash2,
  User,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { secureStorage } from '@/core/storage/secureStorage';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useNotificationPreferences } from '@/features/account/hooks/useNotificationPreferences';
import { isBffError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';
import { type ThemeMode, useThemeMode } from '@/shared/providers/ThemeProvider';

type SettingsItem = {
  title: string;
  icon: LucideIcon;
  description?: string;
  value?: string;
  onPress?: () => void | Promise<void>;
  accessory?: 'chevron' | 'switch' | 'none';
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
  strongDanger?: boolean;
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

type LanguageCode = 'en' | 'es' | 'pt';
type AboutTopic = 'terms' | 'privacy' | 'licenses' | 'support';
type SelectorTopic = 'language' | 'theme';

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
const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
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
  const [storageUsage, setStorageUsage] = useState('Calculating...');

  const refreshStorageUsage = useCallback(async () => {
    const roots = [FileSystem.cacheDirectory, FileSystem.documentDirectory].filter(Boolean) as string[];
    const sizes = await Promise.all(roots.map((root) => directorySize(root).catch(() => 0)));
    setStorageUsage(formatBytes(sizes.reduce((total, size) => total + size, 0)));
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
    selectLanguage,
    toggleDownloadWifiOnly,
    clearCache,
  };
}

function SettingsRow({ item, isLast }: { item: SettingsItem; isLast: boolean }) {
  const theme = useTheme();
  const Icon = item.icon;
  const isPressable = Boolean(item.onPress || item.onToggle);

  const handlePress = () => {
    if (item.accessory === 'switch' && item.onToggle && !item.disabled) {
      item.onToggle(!item.checked);
      return;
    }
    item.onPress?.();
  };

  return (
    <View>
      <Pressable
        disabled={!isPressable}
        onPress={handlePress}
        style={({ pressed }) => [styles.row, item.disabled && styles.disabledRow, pressed && styles.pressed]}>
        <View style={styles.iconSlot}>
          <Icon color={item.danger ? theme.danger : theme.textDim} size={22} strokeWidth={2} />
        </View>
        <View style={styles.rowText}>
          <ThemedText type={item.strongDanger ? 'default' : 'smallBold'} themeColor={item.danger ? 'danger' : 'text'}>
            {item.title}
          </ThemedText>
          {item.description ? (
            <ThemedText type="small" themeColor="textDim">
              {item.description}
            </ThemedText>
          ) : null}
        </View>
        <SettingsRowAccessory item={item} />
      </Pressable>
      {!isLast ? <View style={[styles.separator, { borderTopColor: theme.border }]} /> : null}
    </View>
  );
}

function SettingsRowAccessory({ item }: { item: SettingsItem }) {
  const theme = useTheme();

  if (item.accessory === 'switch') {
    return (
      <Switch
        disabled={item.disabled}
        value={Boolean(item.checked)}
        onValueChange={item.onToggle}
        trackColor={{ false: theme.surfaceHigh, true: theme.accentSoft }}
        thumbColor={item.checked ? theme.accent : theme.textFaint}
      />
    );
  }

  if (item.value) {
    return (
      <View style={styles.valueAccessory}>
        <ThemedText type="small" themeColor="textDim">
          {item.value}
        </ThemedText>
        {item.accessory === 'chevron' ? <ChevronRight color={theme.textFaint} size={18} /> : null}
      </View>
    );
  }

  if (item.accessory === 'chevron') {
    return <ChevronRight color={theme.textFaint} size={18} />;
  }

  return null;
}

function SettingsSectionView({ section }: { section: SettingsSection }) {
  return (
    <View style={styles.sectionBlock}>
      <ThemedText type="smallBold" themeColor="textDim">
        {section.title}
      </ThemedText>
      <ThemedView type="surface" style={styles.sectionCard}>
        {section.items.map((item, index) => (
          <SettingsRow key={item.title} item={item} isLast={index === section.items.length - 1} />
        ))}
      </ThemedView>
    </View>
  );
}

function SelectorModal({
  topic,
  language,
  mode,
  onClose,
  onSelectLanguage,
  onSelectTheme,
}: {
  topic: SelectorTopic | null;
  language: LanguageCode;
  mode: ThemeMode;
  onClose: () => void;
  onSelectLanguage: (language: LanguageCode) => void;
  onSelectTheme: (mode: ThemeMode) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={topic !== null} onRequestClose={onClose}>
      <ThemedView style={styles.modalBackdrop}>
        <ThemedView type="surface" style={styles.modalCard}>
          <ThemedText type="subtitle">{topic === 'language' ? 'Language' : 'Theme'}</ThemedText>
          {topic === 'language'
            ? LANGUAGES.map((option) => (
                <Pressable key={option} onPress={() => onSelectLanguage(option)} style={styles.optionRow}>
                  <ThemedText type="smallBold" themeColor={language === option ? 'accent' : 'text'}>
                    {language === option ? '✓ ' : '   '}
                    {LANGUAGE_LABELS[option]}
                  </ThemedText>
                </Pressable>
              ))
            : (Object.keys(THEME_LABELS) as ThemeMode[]).map((option) => (
                <Pressable key={option} onPress={() => onSelectTheme(option)} style={styles.optionRow}>
                  <ThemedText type="smallBold" themeColor={mode === option ? 'accent' : 'text'}>
                    {mode === option ? '✓ ' : '   '}
                    {THEME_LABELS[option]}
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
              <ThemedText type="small" themeColor="textDim">
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
      <ThemedText type="smallBold" themeColor="accent">
        Close
      </ThemedText>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { mode, setMode } = useThemeMode();
  const { language, downloadWifiOnly, storageUsage, selectLanguage, toggleDownloadWifiOnly, clearCache } = useLocalSettings();
  const { deactivateAccount, deleteAccount } = useAccountActions();
  const { preferences: notificationPreferences, setPushEnabled, setNewPodcastEnabled } = useNotificationPreferences();
  const [aboutTopic, setAboutTopic] = useState<AboutTopic | null>(null);
  const [selectorTopic, setSelectorTopic] = useState<SelectorTopic | null>(null);

  const selectLanguageAndClose = useCallback(
    (next: LanguageCode) => {
      selectLanguage(next);
      setSelectorTopic(null);
    },
    [selectLanguage]
  );

  const selectThemeAndClose = useCallback(
    (next: ThemeMode) => {
      setMode(next);
      setSelectorTopic(null);
    },
    [setMode]
  );

  const showNotificationSetupInfo = useCallback(() => {
    Alert.alert(
      'Push notifications',
      'Push permission and device token setup will be enabled after expo-notifications is added. App notification preferences already save to your account.'
    );
  }, []);

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

  const handleDelete = useCallback(() => {
    showAlert(
      'Delete account',
      'Deleting your account is permanent and cannot be undone. All your profile data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              await logout();
            } catch (deleteError) {
              showAlert('Could not delete account', isBffError(deleteError) ? deleteError.message : 'Try again.');
            }
          },
        },
      ]
    );
  }, [deleteAccount, logout]);

  const sections: SettingsSection[] = [
    {
      title: 'Account',
      items: [
        { title: 'Profile', icon: User, description: 'Personal details', onPress: () => router.push('/settings/profile'), accessory: 'chevron' },
        { title: 'Username', icon: AtSign, description: 'Change your username', onPress: () => router.push('/settings/username'), accessory: 'chevron' },
        {
          title: 'Profile picture',
          icon: Image,
          description: 'Change your avatar',
          onPress: () => router.push('/settings/profile-picture'),
          accessory: 'chevron',
        },
        {
          title: 'Change password',
          icon: KeyRound,
          description: 'Manage your account password',
          onPress: () => router.push('/settings/change-password'),
          accessory: 'chevron',
        },
        { title: 'Log out', icon: LogOut, onPress: logout, accessory: 'none' },
      ],
    },
    {
      title: 'App Preferences',
      items: [
        { title: 'Language', icon: Globe, value: LANGUAGE_LABELS[language], onPress: () => setSelectorTopic('language'), accessory: 'chevron' },
        { title: 'Theme', icon: Moon, value: THEME_LABELS[mode], onPress: () => setSelectorTopic('theme'), accessory: 'chevron' },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          title: 'Push notifications',
          icon: Bell,
          description: 'Receive notifications',
          accessory: 'switch',
          checked: notificationPreferences?.pushEnabled ?? false,
          onToggle: setPushEnabled,
          onPress: showNotificationSetupInfo,
        },
        {
          title: 'New podcasts',
          icon: Mic,
          description: 'Notify me when a new podcast is published',
          accessory: 'switch',
          checked: notificationPreferences?.newPodcastEnabled ?? false,
          onToggle: setNewPodcastEnabled,
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        { title: 'Clear cache', icon: Trash2, description: `Free ${storageUsage}`, onPress: clearCache, accessory: 'none' },
        {
          title: 'Download over Wi‑Fi only',
          icon: Wifi,
          accessory: 'switch',
          checked: downloadWifiOnly,
          onToggle: toggleDownloadWifiOnly,
        },
        { title: 'Storage usage', icon: Database, value: storageUsage, accessory: 'chevron' },
      ],
    },
    {
      title: 'About',
      items: [
        { title: 'App version', icon: Code, value: appVersion(), accessory: 'none' },
        { title: 'Terms & Conditions', icon: FileText, onPress: () => setAboutTopic('terms'), accessory: 'chevron' },
        { title: 'Privacy Policy', icon: Shield, onPress: () => setAboutTopic('privacy'), accessory: 'chevron' },
        { title: 'Open-source licenses', icon: Code, onPress: () => setAboutTopic('licenses'), accessory: 'chevron' },
        { title: 'Contact / Support', icon: HelpCircle, onPress: () => setAboutTopic('support'), accessory: 'chevron' },
        { title: 'Report a problem', icon: AlertCircle, accessory: 'chevron', disabled: true },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          title: 'Deactivate account',
          icon: AlertCircle,
          description: 'Temporarily disable your account',
          onPress: handleDeactivate,
          danger: true,
          accessory: 'none',
        },
        {
          title: 'Delete account',
          icon: Trash2,
          description: 'Permanently delete your account',
          onPress: handleDelete,
          danger: true,
          strongDanger: true,
          accessory: 'none',
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Settings</ThemedText>
            <ThemedText type="small" themeColor="textDim">
              Manage your account, preferences and app settings.
            </ThemedText>
          </ThemedView>

          {sections.map((section) => (
            <SettingsSectionView key={section.title} section={section} />
          ))}
        </ScrollView>
      </SafeAreaView>

      <SelectorModal
        topic={selectorTopic}
        language={language}
        mode={mode}
        onClose={() => setSelectorTopic(null)}
        onSelectLanguage={selectLanguageAndClose}
        onSelectTheme={selectThemeAndClose}
      />
      <AboutModal topic={aboutTopic} onClose={() => setAboutTopic(null)} />
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
  sectionBlock: {
    gap: Spacing.two,
  },
  sectionCard: {
    borderRadius: RADII.card,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 58,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  iconSlot: {
    alignItems: 'center',
    width: 24,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  valueAccessory: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three + 24 + Spacing.three,
  },
  disabledRow: {
    opacity: 0.55,
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
