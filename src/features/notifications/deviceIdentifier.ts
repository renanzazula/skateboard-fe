import * as Crypto from 'expo-crypto';

import { secureStorage } from '@/core/storage/secureStorage';

const DEVICE_ID_KEY = 'skateboard.deviceId';

/**
 * A stable per-install identifier for this device's push registration.
 *
 * The Expo push token cannot serve as the key: it rotates (a reinstall, a
 * restored backup, an Expo project change), and if it were the identity then
 * every rotation would leave a dead registration behind, quietly accumulating
 * tokens the backend keeps trying to deliver to. A separate id that outlives
 * the token means a rotation *updates* one row.
 *
 * Kept in secure storage, which is cleared on uninstall — a fresh install is a
 * genuinely new device, so a new id is the right answer there.
 */
let cached: string | null = null;

export async function getDeviceIdentifier(): Promise<string> {
  if (cached) return cached;

  const existing = await secureStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const created = Crypto.randomUUID();
  await secureStorage.setItem(DEVICE_ID_KEY, created);
  cached = created;
  return created;
}

/** Only for logout, where the next sign-in should register afresh. */
export function forgetCachedDeviceIdentifier(): void {
  cached = null;
}
