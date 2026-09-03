import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/core/auth';
import { openNotificationTarget, type NotificationTarget } from '@/features/notifications/pushNavigation';
import { registerPushDevice } from '@/features/notifications/pushRegistration';

/**
 * Foreground presentation. Without a handler, a notification arriving while
 * the app is open is delivered to the listeners but never shown, which reads
 * as "push is broken" during exactly the testing everyone does first.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for push once the user is signed in, and routes
 * notification taps.
 *
 * Renders nothing — it is mounted inside AuthProvider purely for the
 * lifecycle. Registration has to wait for `signedIn` because it is an
 * authenticated call to the BFF and the device is recorded against the JWT's
 * subject; registering earlier would either 401 or attach the handset to
 * whoever signs in next.
 */
export function PushNotificationsGate() {
  const { status } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (status !== 'signedIn') {
      // Allow a re-register on the next sign-in — the device may now belong
      // to a different account.
      registeredRef.current = false;
      return;
    }
    if (registeredRef.current) return;
    registeredRef.current = true;
    registerPushDevice();
  }, [status]);

  // Expo rotates push tokens without warning (an OS update, a restored
  // backup). Re-registering on rotation is what stops delivery from silently
  // stopping for that device.
  useEffect(() => {
    const subscription = Notifications.addPushTokenListener(() => {
      registerPushDevice();
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
