import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { bffClient } from '@/core/api/client';
import { getDeviceIdentifier } from '@/features/notifications/deviceIdentifier';

/**
 * Registering this device to receive push, and unregistering it again.
 *
 * Deliberately not a React hook: unregistering has to happen inside the logout
 * sequence in core/auth/authStore.ts, which lives outside React so the API
 * client can reach it.
 */

/**
 * EAS project id, which getExpoPushTokenAsync needs to mint a token for the
 * right project. It is in app.json under extra.eas; easConfig is the value
 * an EAS build injects, and is preferred when present.
 */
function projectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

export type PushPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/**
 * Reads the current permission without prompting.
 *
 * <p>Separate from {@link requestPushPermission} because showing the user what
 * their OS setting is must not itself trigger the system prompt — a screen
 * that asks for permission merely by being opened spends the one prompt iOS
 * ever gives us on a render.
 */
export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (!Device.isDevice) return 'unsupported';

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return 'granted';
  // The OS will not ask again, so this is the user's final answer.
  return existing.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Asks for notification permission, without asking twice: iOS only ever shows
 * the system prompt once, so a user who already answered gets their previous
 * answer back rather than a no-op call that looks like a denial.
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  // A simulator has no APNs/FCM registration to make, so a token request there
  // throws rather than returning anything useful.
  if (!Device.isDevice) return 'unsupported';

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return 'granted';
  // canAskAgain false means the user denied it and the OS will not prompt
  // again — asking would silently resolve to denied.
  if (!existing.canAskAgain) return 'denied';

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted ? 'granted' : 'denied';
}

/**
 * Registers this device against the signed-in user. Returns the push token on
 * success, or null when there is nothing to register (no permission, a
 * simulator, a misconfigured project).
 *
 * Never throws: push is an enhancement, and a failure here must not break
 * sign-in or app start. The backend treats registration as idempotent, so the
 * next call retries for free.
 */
export async function registerPushDevice(): Promise<string | null> {
  try {
    if ((await requestPushPermission()) !== 'granted') return null;

    // Android delivers nothing unless a channel exists; the backend sends
    // channelId "default", so this is what makes those messages land.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const id = projectId();
    if (!id) {
      console.warn('[push] no EAS projectId configured; skipping device registration');
      return null;
    }

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    const deviceIdentifier = await getDeviceIdentifier();

    const { error, response } = await bffClient.PUT('/api/me/devices/{deviceIdentifier}', {
      params: { path: { deviceIdentifier } },
      body: {
        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        provider: 'EXPO',
        pushToken,
        appVersion: Constants.expoConfig?.version ?? undefined,
        deviceName: Device.deviceName ?? undefined,
      },
    });

    if (error) {
      console.warn('[push] device registration rejected', response?.status);
      return null;
    }
    return pushToken;
  } catch (err) {
    console.warn('[push] device registration failed', err);
    return null;
  }
}

/**
 * Tells the backend to stop delivering to this device.
 *
 * Must be called while the access token is still valid — see the logout
 * sequence in core/auth/authStore.ts. Without it, notifications meant for the
 * account that just signed out keep arriving on the handset, and would show up
 * for whoever signs in next.
 */
export async function unregisterPushDevice(): Promise<void> {
  try {
    const deviceIdentifier = await getDeviceIdentifier();
    await bffClient.DELETE('/api/me/devices/{deviceIdentifier}', {
      params: { path: { deviceIdentifier } },
    });
  } catch (err) {
    // Never rethrown: a sign-out must complete even if this call cannot. The
    // registration is left live, which the backend also corrects the next time
    // someone registers this same push token under a different account.
    console.warn('[push] device de-registration failed', err);
  }
}
