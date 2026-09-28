import { useSyncExternalStore } from 'react';

import * as inboxStore from '@/features/notifications/inbox/inboxStore';

/** The Notifications screen's view of the shared inbox store, plus its actions. */
export function useNotificationInbox() {
  const state = useSyncExternalStore(inboxStore.subscribe, inboxStore.getState, inboxStore.getState);
  return {
    ...state,
    load: inboxStore.loadInbox,
    refresh: () => inboxStore.loadInbox('refreshing'),
    loadMore: inboxStore.loadMoreInbox,
    markRead: inboxStore.markNotificationRead,
    markAllRead: inboxStore.markAllNotificationsRead,
  };
}
