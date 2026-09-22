import { Alert } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

import { secureStorage } from '@/core/storage/secureStorage';
import { useLocalSettings } from '@/features/settings/hooks/useLocalSettings';

const mockFiles = new Map<string, { isDirectory?: boolean; size?: number; children?: string[] }>();

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn((uri: string) => {
    const entry = mockFiles.get(uri);
    if (!entry) return Promise.resolve({ exists: false });
    return Promise.resolve({ exists: true, isDirectory: entry.isDirectory ?? false, size: entry.size ?? 0 });
  }),
  readDirectoryAsync: jest.fn((uri: string) => Promise.resolve(mockFiles.get(uri)?.children ?? [])),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { getItem: jest.fn(), setItem: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/core/i18n/languageStore', () => {
  const actual = jest.requireActual('@/core/i18n/languageStore');
  return { ...actual, setLanguage: jest.fn() };
});

const { setLanguage } = jest.requireMock('@/core/i18n/languageStore');
const mockGetItem = secureStorage.getItem as jest.Mock;

describe('useLocalSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
    mockGetItem.mockResolvedValue(null);
  });

  it('starts with no cache and calculates storage usage as empty roots resolve', async () => {
    const { result } = await renderHook(() => useLocalSettings());

    await waitFor(() => expect(result.current.isCalculatingStorage).toBe(false));

    expect(result.current.storageUsage).toBe('0 B');
    expect(result.current.downloadWifiOnly).toBe(false);
  });

  it('loads the persisted wifi-only preference', async () => {
    mockGetItem.mockResolvedValueOnce('true');
    const { result } = await renderHook(() => useLocalSettings());

    await waitFor(() => expect(result.current.downloadWifiOnly).toBe(true));
  });

  it('sums directory sizes recursively and formats them', async () => {
    mockFiles.set('file:///cache/', { isDirectory: true, children: ['a.jpg', 'sub'] });
    mockFiles.set('file:///cache/a.jpg', { isDirectory: false, size: 2048 });
    mockFiles.set('file:///cache/sub', { isDirectory: true, children: ['b.jpg'] });
    mockFiles.set('file:///cache/sub/b.jpg', { isDirectory: false, size: 1024 });

    const { result } = await renderHook(() => useLocalSettings());

    await waitFor(() => expect(result.current.isCalculatingStorage).toBe(false));

    expect(result.current.storageUsage).toBe('3.0 KB');
  });

  it('selectLanguage delegates to the language store', async () => {
    const { result } = await renderHook(() => useLocalSettings());
    await waitFor(() => expect(result.current.isCalculatingStorage).toBe(false));

    result.current.selectLanguage('es');

    expect(setLanguage).toHaveBeenCalledWith('es');
  });

  it('toggleDownloadWifiOnly updates state and persists the value', async () => {
    const { result } = await renderHook(() => useLocalSettings());
    await waitFor(() => expect(result.current.isCalculatingStorage).toBe(false));

    result.current.toggleDownloadWifiOnly(true);

    await waitFor(() => expect(result.current.downloadWifiOnly).toBe(true));
    expect(secureStorage.setItem).toHaveBeenCalledWith('skateboard.settings.downloadWifiOnly', 'true');
  });

  it('clearCache deletes cache entries and refreshes storage usage on confirm', async () => {
    mockFiles.set('file:///cache/', { isDirectory: true, children: ['a.jpg'] });
    mockFiles.set('file:///cache/a.jpg', { isDirectory: false, size: 512 });
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { result } = await renderHook(() => useLocalSettings());
    await waitFor(() => expect(result.current.isCalculatingStorage).toBe(false));

    await result.current.clearCache();

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    const { deleteAsync } = jest.requireMock('expo-file-system/legacy');
    expect(deleteAsync).toHaveBeenCalledWith('file:///cache/a.jpg', { idempotent: true });
  });
});
