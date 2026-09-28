import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { useAuth } from '@/core/auth';
import { markNotificationRead, refreshUnreadCount } from '@/features/notifications/inbox/inboxStore';
import { openNotificationTarget } from '@/features/notifications/pushNavigation';
import { registerPushDevice } from '@/features/notifications/pushRegistration';
import { PushNotificationsGate } from '@/features/notifications/PushNotificationsGate';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  useLastNotificationResponse: jest.fn(() => undefined),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/notifications/pushNavigation', () => ({
  openNotificationTarget: jest.fn(),
}));

jest.mock('@/features/notifications/inbox/inboxStore', () => ({
  markNotificationRead: jest.fn(),
  refreshUnreadCount: jest.fn(),
}));

jest.mock('@/features/notifications/pushRegistration', () => ({
  registerPushDevice: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseLastNotificationResponse = Notifications.useLastNotificationResponse as jest.Mock;
const mockAddPushTokenListener = Notifications.addPushTokenListener as jest.Mock;
const mockRegisterPushDevice = registerPushDevice as jest.Mock;
const mockOpenNotificationTarget = openNotificationTarget as jest.Mock;
const mockAddNotificationReceivedListener = Notifications.addNotificationReceivedListener as jest.Mock;
const mockMarkNotificationRead = markNotificationRead as jest.Mock;
const mockRefreshUnreadCount = refreshUnreadCount as jest.Mock;

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

  it('re-reads the unread count when a push arrives while the app is open', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedIn' });
    await render(<PushNotificationsGate />);

    const onReceived = mockAddNotificationReceivedListener.mock.calls[0][0] as () => void;
    await act(async () => onReceived());

    expect(mockRefreshUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('does not listen for received pushes while signed out', async () => {
    await render(<PushNotificationsGate />);

    expect(mockAddNotificationReceivedListener).not.toHaveBeenCalled();
  });

  it('marks a tapped push read once the session is restored', async () => {
    mockUseAuth.mockReturnValue({ status: 'loading' });
    mockUseLastNotificationResponse.mockReturnValue({
      notification: {
        request: {
          identifier: 'notif-2',
          content: { data: { targetType: 'PODCAST', targetSlug: 'ep-2', notificationId: 'n-2' } },
        },
      },
    });
    const { rerender } = await render(<PushNotificationsGate />);
    expect(mockMarkNotificationRead).not.toHaveBeenCalled();

    mockUseAuth.mockReturnValue({ status: 'signedIn' });
    await rerender(<PushNotificationsGate />);

    expect(mockMarkNotificationRead).toHaveBeenCalledTimes(1);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith('n-2');
  });

  it('does not mark anything read for a push without a notification id', async () => {
    mockUseAuth.mockReturnValue({ status: 'signedIn' });
    mockUseLastNotificationResponse.mockReturnValue({
      notification: { request: { identifier: 'notif-3', content: { data: { targetType: 'PODCAST' } } } },
    });
    await render(<PushNotificationsGate />);

    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
  });
});
