import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import * as inboxStore from '@/features/notifications/inbox/inboxStore';

const selectCount = () => inboxStore.getState().unreadCount;

/**
 * The bell's badge. Re-read on mount and whenever the app returns to the
 * foreground — a push that arrived while the app was backgrounded fires no
 * in-app listener. Pushes received while open are handled by
 * PushNotificationsGate.
 */
export function useUnreadNotificationCount(): number {
  const count = useSyncExternalStore(inboxStore.subscribe, selectCount, selectCount);

  useEffect(() => {
    void inboxStore.refreshUnreadCount();
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous !== 'active' && next === 'active') {
        void inboxStore.refreshUnreadCount();
      }
      previous = next;
    });
    return () => subscription.remove();
  }, []);

  return count;
}
