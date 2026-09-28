import { bffClient } from '@/core/api/client';
import * as authStore from '@/core/auth/authStore';
import {
  appendPage,
  countUnread,
  markItemRead,
  markItemsReadUpTo,
} from '@/features/notifications/inbox/inboxState';
import type { InboxItem } from '@/features/notifications/inbox/types';
import { toBffError } from '@/shared/api/errors';

export const INBOX_PAGE_SIZE = 20;

export interface InboxState {
  items: InboxItem[];
  /** Last page loaded; -1 before the first load. */
  page: number;
  hasMore: boolean;
  status: 'idle' | 'loading' | 'refreshing' | 'loadingMore';
  error: Error | null;
  /** When the first page was requested — read-all's cut-off. */
  loadedAt: string | null;
  unreadCount: number;
}

const initialState: InboxState = {
  items: [],
  page: -1,
  hasMore: false,
  status: 'idle',
  error: null,
  loadedAt: null,
  unreadCount: 0,
};

/**
 * Module-level store, the same pattern as useProfile: the Home bell and the
 * Notifications screen are separate components that must agree on the unread
 * count, and a read on the screen has to reach the bell the moment the user
 * navigates back.
 */
let state: InboxState = initialState;
const listeners = new Set<() => void>();
/** Bumped on every first-page load and on reset, so a stale response is dropped. */
let generation = 0;

function setState(patch: Partial<InboxState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): InboxState {
  return state;
}

export function resetInbox(): void {
  generation += 1;
  state = initialState;
  listeners.forEach((listener) => listener());
}

// One account's inbox must never be shown to whoever signs in next.
let wasSignedIn = authStore.getState().status === 'signedIn';
authStore.subscribe(() => {
  const isSignedIn = authStore.getState().status === 'signedIn';
  if (wasSignedIn && !isSignedIn) {
    resetInbox();
  }
  wasSignedIn = isSignedIn;
});

/** Best-effort: a failed badge refresh keeps the last known count rather than flashing an error. */
export async function refreshUnreadCount(): Promise<void> {
  const requestGeneration = generation;
  try {
    const { data, error } = await bffClient.GET('/api/me/notifications/unread-count');
    if (error || !data || requestGeneration !== generation) return;
    setState({ unreadCount: data.count });
  } catch {
    // Network failure — same as above.
  }
}

/** Loads (or reloads) the first page. `refreshing` is the pull-to-refresh variant. */
export async function loadInbox(mode: 'loading' | 'refreshing' = 'loading'): Promise<void> {
  generation += 1;
  const requestGeneration = generation;
  const loadedAt = new Date().toISOString();
  setState({ status: mode, error: null });

  refreshUnreadCount();
  try {
    const { data, error, response } = await bffClient.GET('/api/me/notifications', {
      params: { query: { page: 0, size: INBOX_PAGE_SIZE } },
    });
    if (requestGeneration !== generation) return;
    if (error || !data) {
      setState({ status: 'idle', error: toBffError(error ?? {}, response.status) });
      return;
    }
    setState({ items: data.items, page: 0, hasMore: data.hasMore, status: 'idle', loadedAt });
  } catch (err) {
    if (requestGeneration !== generation) return;
    setState({ status: 'idle', error: err instanceof Error ? err : new Error(String(err)) });
  }
}

export async function loadMoreInbox(): Promise<void> {
  if (!state.hasMore || state.status !== 'idle') return;
  const requestGeneration = generation;
  const nextPage = state.page + 1;
  setState({ status: 'loadingMore' });

  try {
    const { data, error } = await bffClient.GET('/api/me/notifications', {
      params: { query: { page: nextPage, size: INBOX_PAGE_SIZE } },
    });
    if (requestGeneration !== generation) return;
    if (error || !data) {
      // Leave what is already listed; scrolling again retries.
      setState({ status: 'idle' });
      return;
    }
    setState({
      items: appendPage(state.items, data.items),
      page: nextPage,
      hasMore: data.hasMore,
      status: 'idle',
    });
  } catch {
    if (requestGeneration === generation) setState({ status: 'idle' });
  }
}

/**
 * Optimistic: the row and the badge update before the request, and roll back
 * if it fails. A notification that is not in the loaded list (a tapped push,
 * before the screen was ever opened) is sent as-is and the count re-read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const target = state.items.find((item) => item.notificationId === notificationId);
  if (target?.read) return;

  const snapshot = { items: state.items, unreadCount: state.unreadCount };
  if (target) {
    setState({
      items: markItemRead(state.items, notificationId, new Date().toISOString()),
      unreadCount: Math.max(0, state.unreadCount - 1),
    });
  }

  try {
    const { error } = await bffClient.POST('/api/me/notifications/{notificationId}/read', {
      params: { path: { notificationId } },
    });
    if (error) throw error;
    if (!target) refreshUnreadCount();
  } catch {
    if (target) setState(snapshot);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const before = state.loadedAt ?? new Date().toISOString();
  const snapshot = { items: state.items, unreadCount: state.unreadCount };
  const items = markItemsReadUpTo(state.items, before, new Date().toISOString());
  const changed = countUnread(state.items) - countUnread(items);
  setState({ items, unreadCount: Math.max(0, state.unreadCount - changed) });

  try {
    const { error } = await bffClient.POST('/api/me/notifications/read-all', { body: { before } });
    if (error) throw error;
    // Unread rows beyond the loaded pages were marked too; re-read the true count.
    refreshUnreadCount();
  } catch {
    setState(snapshot);
  }
}
