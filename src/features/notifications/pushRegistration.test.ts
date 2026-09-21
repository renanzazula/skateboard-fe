import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { bffClient } from '@/core/api/client';
import { getDeviceIdentifier } from '@/features/notifications/deviceIdentifier';
import {
  getPushPermissionState,
  registerPushDevice,
  requestPushPermission,
  resetPushRegistrationState,
  unregisterPushDevice,
} from '@/features/notifications/pushRegistration';

jest.mock('expo-constants', () => ({
  easConfig: null,
  expoConfig: { extra: { eas: { projectId: 'project-1' } }, version: '1.2.3' },
}));

// Namespace imports (`import * as Device from 'expo-device'`) get a
// value-snapshot from Babel's interop helper for plain data properties, so a
// later mutation of a plain `isDevice: true` field here would never be seen
// by pushRegistration.ts's own `Device.isDevice` read. An accessor property
// is copied by reference instead, so both sides share the same live value.
jest.mock('expo-device', () => {
  let isDevice = true;
  return {
    get isDevice() {
      return isDevice;
    },
    set isDevice(value: boolean) {
      isDevice = value;
    },
    deviceName: 'Test Device',
  };
});

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock('@/core/api/client', () => ({
  bffClient: { PUT: jest.fn(), DELETE: jest.fn() },
}));

jest.mock('@/features/notifications/deviceIdentifier', () => ({
  getDeviceIdentifier: jest.fn().mockResolvedValue('device-1'),
}));

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetExpoPushToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;
const mockDelete = bffClient.DELETE as jest.Mock;
const mockGetDeviceIdentifier = getDeviceIdentifier as jest.Mock;

const mockDevice = jest.requireMock('expo-device') as { isDevice: boolean };
const originalOS = Platform.OS;
const originalIsDevice = mockDevice.isDevice;

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function setIsDevice(value: boolean) {
  mockDevice.isDevice = value;
}

describe('pushRegistration', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetPushRegistrationState();
    setOS('ios');
    setIsDevice(true);
    mockGetDeviceIdentifier.mockResolvedValue('device-1');
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    setOS(originalOS);
    setIsDevice(originalIsDevice);
    warnSpy.mockRestore();
  });

  describe('getPushPermissionState', () => {
    it('returns unsupported on web', async () => {
      setOS('web');
      expect(await getPushPermissionState()).toBe('unsupported');
    });

    it('returns unsupported on a simulator', async () => {
      setIsDevice(false);
      expect(await getPushPermissionState()).toBe('unsupported');
    });

    it('returns granted when already granted', async () => {
      mockGetPermissions.mockResolvedValueOnce({ granted: true, canAskAgain: true });
      expect(await getPushPermissionState()).toBe('granted');
    });

    it('returns undetermined when not yet asked', async () => {
      mockGetPermissions.mockResolvedValueOnce({ granted: false, canAskAgain: true });
      expect(await getPushPermissionState()).toBe('undetermined');
    });

    it('returns denied when the OS will not ask again', async () => {
      mockGetPermissions.mockResolvedValueOnce({ granted: false, canAskAgain: false });
      expect(await getPushPermissionState()).toBe('denied');
    });
  });

  describe('requestPushPermission', () => {
    it('returns unsupported when push is unsupported', async () => {
      setOS('web');
      expect(await requestPushPermission()).toBe('unsupported');
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('returns granted without prompting when already granted', async () => {
      mockGetPermissions.mockResolvedValueOnce({ granted: true, canAskAgain: true });
      expect(await requestPushPermission()).toBe('granted');
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('returns denied without prompting when the OS will not ask again', async () => {
      mockGetPermissions.mockResolvedValueOnce({ granted: false, canAskAgain: false });
      expect(await requestPushPermission()).toBe('denied');
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('prompts and returns the result when askable', async () => {
      mockGetPermissions.mockResolvedValueOnce({ granted: false, canAskAgain: true });
      mockRequestPermissions.mockResolvedValueOnce({ granted: true });
      expect(await requestPushPermission()).toBe('granted');
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerPushDevice', () => {
    function grantPermission() {
      mockGetPermissions.mockResolvedValueOnce({ granted: true, canAskAgain: true });
    }

    it('returns null without registering when permission is not granted', async () => {
      mockGetPermissions.mockResolvedValueOnce({ granted: false, canAskAgain: false });

      const result = await registerPushDevice();

      expect(result).toBeNull();
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('registers and returns the push token on success', async () => {
      grantPermission();
      mockGetExpoPushToken.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });
      mockPut.mockResolvedValueOnce({ error: undefined, response: { status: 200 } });

      const result = await registerPushDevice();

      expect(result).toBe('ExponentPushToken[abc]');
      expect(mockPut).toHaveBeenCalledWith('/api/me/devices/{deviceIdentifier}', {
        params: { path: { deviceIdentifier: 'device-1' } },
        body: { platform: 'IOS', provider: 'EXPO', pushToken: 'ExponentPushToken[abc]', appVersion: '1.2.3', deviceName: 'Test Device' },
      });
    });

    it('sets up the Android notification channel on android', async () => {
      setOS('android');
      grantPermission();
      mockGetExpoPushToken.mockResolvedValueOnce({ data: 'token' });
      mockPut.mockResolvedValueOnce({ error: undefined, response: { status: 200 } });

      await registerPushDevice();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    });

    it('returns null and warns when no EAS projectId is configured', async () => {
      grantPermission();
      const constantsMock = Constants as unknown as { expoConfig: { extra: { eas: { projectId?: string } } } };
      constantsMock.expoConfig.extra.eas.projectId = undefined;

      const result = await registerPushDevice();

      expect(result).toBeNull();
      expect(mockGetExpoPushToken).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no EAS projectId'));

      constantsMock.expoConfig.extra.eas.projectId = 'project-1';
    });

    it('returns null when the backend rejects the registration', async () => {
      grantPermission();
      mockGetExpoPushToken.mockResolvedValueOnce({ data: 'token' });
      mockPut.mockResolvedValueOnce({ error: { code: 'X', message: 'nope' }, response: { status: 500 } });

      const result = await registerPushDevice();

      expect(result).toBeNull();
    });

    it('skips the PUT and still returns the token when the same registration was already accepted', async () => {
      grantPermission();
      mockGetExpoPushToken.mockResolvedValueOnce({ data: 'token' });
      mockPut.mockResolvedValueOnce({ error: undefined, response: { status: 200 } });
      await registerPushDevice();

      grantPermission();
      mockGetExpoPushToken.mockResolvedValueOnce({ data: 'token' });

      const result = await registerPushDevice();

      expect(result).toBe('token');
      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it('coalesces concurrent calls into a single attempt', async () => {
      grantPermission();
      mockGetExpoPushToken.mockResolvedValueOnce({ data: 'token' });
      mockPut.mockResolvedValueOnce({ error: undefined, response: { status: 200 } });

      const [a, b] = await Promise.all([registerPushDevice(), registerPushDevice()]);

      expect(a).toBe('token');
      expect(b).toBe('token');
      expect(mockGetPermissions).toHaveBeenCalledTimes(1);
    });

    it('never throws, returning null when something unexpected fails', async () => {
      grantPermission();
      mockGetExpoPushToken.mockRejectedValueOnce(new Error('boom'));

      const result = await registerPushDevice();

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('[push] device registration failed', expect.any(Error));
    });
  });

  describe('unregisterPushDevice', () => {
    it('does nothing when push is unsupported', async () => {
      setOS('web');
      await unregisterPushDevice();
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deletes the device registration', async () => {
      mockDelete.mockResolvedValueOnce({ error: undefined, response: { status: 204 } });

      await unregisterPushDevice();

      expect(mockDelete).toHaveBeenCalledWith('/api/me/devices/{deviceIdentifier}', {
        params: { path: { deviceIdentifier: 'device-1' } },
      });
    });

    it('swallows errors so sign-out can complete', async () => {
      mockDelete.mockRejectedValueOnce(new Error('offline'));

      await expect(unregisterPushDevice()).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith('[push] device de-registration failed', expect.any(Error));
    });
  });
});
