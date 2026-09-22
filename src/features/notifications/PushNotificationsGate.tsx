import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/core/auth';
import { openNotificationTarget, type NotificationTarget } from '@/features/notifications/pushNavigation';
import { registerPushDevice } from '@/features/notifications/pushRegistration';

/**
 * Foreground presentation. Without a handler, a notification arriving while
 * the app is open is delivered to the listeners but never shown, which reads
 * as "push is broken" during exactly the testing everyone does first.
 *
 * Skipped on web, where it subscribes to an emitter stub that only logs a
 * "not yet fully supported" warning on every load.
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Registers this device for push once the user is signed in, and routes
 * notification taps.
 *
 * Renders nothing — it is mounted inside AuthProvider purely for the
 * lifecycle. Registration has to wait for `signedIn` because it is an
 * authenticated call to the BFF and the device is recorded against the JWT's
 * subject; registering earlier would either 401 or attach the handset to
 * whoever signs in next.
 *
 * The whole thing is native-only, and the split is not cosmetic:
 * `useLastNotificationResponse` is a hook, so it cannot be called
 * conditionally, and expo-notifications' web build has no
 * `getLastNotificationResponse` behind it — calling it on web throws
 * "not available on web" out of a render, which the root ErrorBoundary turns
 * into a blank app on every page load. Returning null before the native
 * component is ever rendered is what keeps that code off the web bundle's
 * execution path.
 */
export function PushNotificationsGate() {
  if (Platform.OS === 'web') return null;
  return <NativePushNotificationsGate />;
}

function NativePushNotificationsGate() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'signedIn') return;
    // Repeat calls are absorbed by registerPushDevice itself — it coalesces
    // overlapping attempts and skips a resend of an already-accepted payload —
    // so this no longer needs a latch of its own. The previous one guarded only
    // the window before the first attempt *finished*, which is precisely the
    // window the foreground and token-rotation triggers fired in.
    registerPushDevice();
  }, [status]);

  /**
   * Granting permission means leaving for the OS settings app and coming back,
   * and enabling it there fires no notification event of any kind. Retrying on
   * foreground is what turns that into a working registration instead of one
   * that only happens at the next sign-in.
   *
   * Only background/inactive -> active counts. iOS reports 'active' again after
   * anything that merely covered the app — the notification permission prompt
   * this very flow raises, Control Centre, an incoming call banner — so
   * retrying on every 'active' event retried during our own permission prompt.
   */
  useEffect(() => {
    if (status !== 'signedIn') return;
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      const returnedToForeground = previous !== 'active' && state === 'active';
      previous = state;
      if (returnedToForeground) {
        registerPushDevice();
      }
    });
    return () => subscription.remove();
  }, [status]);

  // Expo rotates push tokens without warning (an OS update, a restored
  // backup). Re-registering on rotation is what stops delivery from silently
  // stopping for that device.
  //
  // The token is handed straight to registerPushDevice. Letting it fetch its
  // own would call getDevicePushTokenAsync, which re-fires this listener —
  // the infinite loop expo-notifications warns about on PushTokenListener.
  //
  // Deliberately not gated on `status`, unlike the two effects above. iOS
  // delivers the APNs token during launch, while bootstrap() is still restoring
  // the session, so this fires with status 'loading' on every cold start; that
  // is what made each launch open with a 401 on the registration PUT. The guard
  // lives inside registerPushDevice rather than here because subscribing on
  // `status` would tear down and re-attach the listener on every auth
  // transition, and a rotation arriving in that gap is simply lost. Registering
  // once and letting the call itself decline while unauthenticated keeps the
  // subscription stable; the sign-in effect above re-registers with the current
  // token the moment a session exists.
  useEffect(() => {
    const subscription = Notifications.addPushTokenListener((token) => {
      registerPushDevice(token);
    });
    return () => subscription.remove();
  }, []);

  // useLastNotificationResponse rather than
  // addNotificationResponseReceivedListener, because the tap that *launched*
  // the app happens before any listener could be attached — and a cold start
  // is the common case for opening a notification. It keeps returning the same
  // response across re-renders, hence the identifier guard.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastResponse) return;
    const identifier = lastResponse.notification.request.identifier;
    if (handledResponseRef.current === identifier) return;
    handledResponseRef.current = identifier;

    openNotificationTarget(
      lastResponse.notification.request.content.data as NotificationTarget | undefined
    );
  }, [lastResponse]);

  return null;
}
