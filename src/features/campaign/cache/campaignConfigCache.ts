import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { CampaignConfigCache, CampaignRuntime } from '@/features/campaign/types';

/**
 * Persists the last `GET /api/campaigns/active` result between launches so the
 * resolver can render from it immediately while a fresh copy is fetched in the
 * background (stale-while-revalidate, spec §12). Not `secureStorage` — the
 * payload (screens + text + URLs for N campaigns) can exceed SecureStore's
 * ~2KB Android limit; a plain JSON file in the document directory has no such
 * cap. On web (no FileSystem) it falls back to localStorage.
 *
 * Every read/write is wrapped so a missing/corrupt cache degrades to "no
 * cached campaigns", never an error.
 */
const FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}campaign-config-cache.json`
  : null;
const WEB_KEY = 'skateboard.campaign.configCache';

export async function readCampaignConfigCache(): Promise<CampaignConfigCache | null> {
  try {
    const raw = await readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignConfigCache;
    if (typeof parsed?.fetchedAt !== 'number' || !Array.isArray(parsed.campaigns)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCampaignConfigCache(campaigns: CampaignRuntime[]): Promise<void> {
  const payload: CampaignConfigCache = { fetchedAt: Date.now(), campaigns };
  try {
    await writeRaw(JSON.stringify(payload));
  } catch (err) {
    console.warn('[campaign] could not persist config cache', err);
  }
}

export async function clearCampaignConfigCache(): Promise<void> {
  try {
    if (FILE_URI) {
      await FileSystem.deleteAsync(FILE_URI, { idempotent: true });
    } else {
      globalThis.localStorage?.removeItem(WEB_KEY);
    }
  } catch {
    // best-effort
  }
}

async function readRaw(): Promise<string | null> {
  if (FILE_URI) {
    const info = await FileSystem.getInfoAsync(FILE_URI);
    if (!info.exists) return null;
    return FileSystem.readAsStringAsync(FILE_URI);
  }
  return globalThis.localStorage?.getItem(WEB_KEY) ?? null;
}

async function writeRaw(value: string): Promise<void> {
  if (FILE_URI) {
    await FileSystem.writeAsStringAsync(FILE_URI, value);
    return;
  }
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(WEB_KEY, value);
  }
}
