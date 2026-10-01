import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { parseNotificationTarget } from '@/features/notifications/pushNavigation';

/**
 * Whether this launch is the result of tapping a notification the app can
 * open. Read synchronously so the root layout can decide on its first render,
 * before the startup campaign starts resolving — a user who tapped "new
 * episode" should land on the episode, not on a campaign first.
 *
 * Native only: expo-notifications' web build throws "not available on web"
 * from getLastNotificationResponse. Any failure reads as "not from a
 * notification", which just keeps today's behaviour.
 */
export function wasLaunchedFromNotification(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    const response = Notifications.getLastNotificationResponse();
    return parseNotificationTarget(response?.notification.request.content.data) !== null;
  } catch {
    return false;
  }
}
