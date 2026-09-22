import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { useAuth } from '@/core/auth';
import { openNotificationTarget } from '@/features/notifications/pushNavigation';
import { registerPushDevice } from '@/features/notifications/pushRegistration';
import { PushNotificationsGate } from '@/features/notifications/PushNotificationsGate';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  useLastNotificationResponse: jest.fn(() => undefined),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/notifications/pushNavigation', () => ({
  openNotificationTarget: jest.fn(),
}));

jest.mock('@/features/notifications/pushRegistration', () => ({
  registerPushDevice: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseLastNotificationResponse = Notifications.useLastNotificationResponse as jest.Mock;
const mockAddPushTokenListener = Notifications.addPushTokenListener as jest.Mock;
const mockRegisterPushDevice = registerPushDevice as jest.Mock;
const mockOpenNotificationTarget = openNotificationTarget as jest.Mock;

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('PushNotificationsGate', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ status: 'signedOut' });
    mockUseLastNotificationResponse.mockReturnValue(undefined);
    setOS('ios');
  });

  afterEach(() => {
    setOS(originalOS);
  });

  it('renders nothing on web, without touching any native APIs', async () => {
    setOS('web');
    mockUseAuth.mockReturnValue({ status: 'signedIn' });
    const { toJSON } = await render(<PushNotificationsGate />);

    expect(toJSON()).toBeNull();
    expect(mockRegisterPushDevice).not.toHaveBeenCalled();
  });

  it('does not register while signed out', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedOut' });
    await render(<PushNotificationsGate />);

    expect(mockRegisterPushDevice).not.toHaveBeenCalled();
  });

  it('registers the device once signed in', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedIn' });
    await render(<PushNotificationsGate />);

    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
    expect(mockRegisterPushDevice).toHaveBeenCalledWith();
  });

  it('re-registers when returning to the foreground while signed in', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedIn' });
    let listener: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
      listener = cb as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true });

    await render(<PushNotificationsGate />);
    mockRegisterPushDevice.mockClear();

    await act(async () => listener?.('active'));

    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
  });

  it('does not re-register on a foreground event that is not a real background-to-active transition', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedIn' });
    let listener: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
      listener = cb as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });

    await render(<PushNotificationsGate />);
    mockRegisterPushDevice.mockClear();

    await act(async () => listener?.('inactive'));

    expect(mockRegisterPushDevice).not.toHaveBeenCalled();
  });

  it('re-registers with the new token when the push token rotates', async () => {
    let tokenListener: ((token: unknown) => void) | undefined;
    mockAddPushTokenListener.mockImplementation((cb) => {
      tokenListener = cb;
      return { remove: jest.fn() };
    });
    await render(<PushNotificationsGate />);

    await act(async () => tokenListener?.('new-token'));

    expect(mockRegisterPushDevice).toHaveBeenCalledWith('new-token');
  });

  it('opens the notification target from the last notification response', async () => {
    mockUseLastNotificationResponse.mockReturnValue({
      notification: {
        request: { identifier: 'notif-1', content: { data: { targetType: 'PODCAST', targetSlug: 'ep-1' } } },
      },
    });
    await render(<PushNotificationsGate />);

    expect(mockOpenNotificationTarget).toHaveBeenCalledWith({ targetType: 'PODCAST', targetSlug: 'ep-1' });
  });

  it('does not reopen the same notification response twice', async () => {
    mockUseLastNotificationResponse.mockReturnValue({
      notification: { request: { identifier: 'notif-1', content: { data: {} } } },
    });
    const { rerender } = await render(<PushNotificationsGate />);
    expect(mockOpenNotificationTarget).toHaveBeenCalledTimes(1);

    await rerender(<PushNotificationsGate />);

    expect(mockOpenNotificationTarget).toHaveBeenCalledTimes(1);
  });
});
