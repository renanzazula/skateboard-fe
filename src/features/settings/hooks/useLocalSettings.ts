import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';

import { secureStorage } from '@/core/storage/secureStorage';
import { showAlert } from '@/shared/utils/alert';

export type LanguageCode = 'en' | 'es' | 'pt';

const LANGUAGE_STORAGE_KEY = 'skateboard.settings.language';
const WIFI_ONLY_STORAGE_KEY = 'skateboard.settings.downloadWifiOnly';

export const LANGUAGES: LanguageCode[] = ['en', 'es', 'pt'];
export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === 'en' || value === 'es' || value === 'pt';
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

/** Language / cache / Wi-Fi-only / storage-usage local preferences — shared by Settings home (Language row) and Data & storage. */
export function useLocalSettings() {
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
      showAlert('Clear cache', 'No cache directory is available on this platform.');
      return;
    }

    showAlert('Clear cache', 'Clear local cached files? Backend user data will not be changed.', [
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
