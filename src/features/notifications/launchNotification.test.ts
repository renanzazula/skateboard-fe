import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { wasLaunchedFromNotification } from '@/features/notifications/launchNotification';

jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: jest.fn(),
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useRootNavigationState: jest.fn() }));

const mockGetLastNotificationResponse = Notifications.getLastNotificationResponse as jest.Mock;

function responseWith(data: unknown) {
  return { notification: { request: { identifier: 'n', content: { data } } } };
}

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('wasLaunchedFromNotification', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setOS('ios');
  });

  afterEach(() => {
    setOS(originalOS);
  });

  it('is true when the launching tap carries an openable target', () => {
    mockGetLastNotificationResponse.mockReturnValue(responseWith({ targetType: 'PODCAST', targetSlug: 'ep-1' }));

    expect(wasLaunchedFromNotification()).toBe(true);
  });

  it('is false for an ordinary launch', () => {
    mockGetLastNotificationResponse.mockReturnValue(null);

    expect(wasLaunchedFromNotification()).toBe(false);
  });

  it('is false when the tapped notification cannot be opened', () => {
    mockGetLastNotificationResponse.mockReturnValue(responseWith({ targetType: 'PODCAST' }));

    expect(wasLaunchedFromNotification()).toBe(false);
  });

  it('is false when the native call throws', () => {
    mockGetLastNotificationResponse.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(wasLaunchedFromNotification()).toBe(false);
  });

  it('never touches expo-notifications on web', () => {
    setOS('web');

    expect(wasLaunchedFromNotification()).toBe(false);
    expect(mockGetLastNotificationResponse).not.toHaveBeenCalled();
  });
});
