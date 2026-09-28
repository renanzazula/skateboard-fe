import { bffClient } from '@/core/api/client';
import * as authStore from '@/core/auth/authStore';
import * as inboxStore from '@/features/notifications/inbox/inboxStore';
import type { InboxItem } from '@/features/notifications/inbox/types';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), POST: jest.fn() },
}));

let authListener: (() => void) | undefined;
jest.mock('@/core/auth/authStore', () => ({
  getState: jest.fn(() => ({ status: 'signedIn' })),
  subscribe: jest.fn((listener: () => void) => {
    authListener = listener;
    return () => {};
  }),
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPost = bffClient.POST as jest.Mock;
const mockAuthState = authStore.getState as jest.Mock;

function item(id: string, createdAt: string, read = false): InboxItem {
  return { notificationId: id, type: 'NEW_PODCAST', title: id, body: '', data: {}, createdAt, readAt: null, read };
}

function ok<T>(data: T) {
  return { data, error: undefined, response: { status: 200 } };
}

/** Routes GETs by path so the unread-count refresh and the list can both be stubbed. */
function stubGets({ count = 0, pages = [] as { items: InboxItem[]; hasMore: boolean }[] } = {}) {
  let page = 0;
  mockGet.mockImplementation((path: string) => {
    if (path === '/api/me/notifications/unread-count') return Promise.resolve(ok({ count }));
    const next = pages[page] ?? { items: [], hasMore: false };
    page += 1;
    return Promise.resolve(ok({ ...next, page: page - 1, size: 20 }));
  });
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('inboxStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inboxStore.resetInbox();
  });

  it('loads the first page and the unread count', async () => {
    stubGets({ count: 2, pages: [{ items: [item('a', '2026-09-28T10:00:00Z')], hasMore: true }] });

    await inboxStore.loadInbox();
    await flush();

    const state = inboxStore.getState();
    expect(state.items.map((i) => i.notificationId)).toEqual(['a']);
    expect(state.hasMore).toBe(true);
    expect(state.unreadCount).toBe(2);
    expect(state.loadedAt).not.toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/api/me/notifications', { params: { query: { page: 0, size: 20 } } });
  });

  it('records a load failure as an error', async () => {
    mockGet.mockImplementation((path: string) =>
      path === '/api/me/notifications'
        ? Promise.resolve({ data: undefined, error: { code: 'X', message: 'down' }, response: { status: 503 } })
        : Promise.resolve(ok({ count: 0 }))
    );

    await inboxStore.loadInbox();

    expect(inboxStore.getState().error?.message).toBe('down');
    expect(inboxStore.getState().status).toBe('idle');
  });

  it('records a thrown load failure as an error', async () => {
    mockGet.mockRejectedValue(new Error('offline'));

    await inboxStore.loadInbox();

    expect(inboxStore.getState().error?.message).toBe('offline');
  });

  it('appends the next page and stops when there is no more', async () => {
    stubGets({
      pages: [
        { items: [item('a', '2026-09-28T10:00:00Z')], hasMore: true },
        { items: [item('a', '2026-09-28T10:00:00Z'), item('b', '2026-09-28T09:00:00Z')], hasMore: false },
      ],
    });
    await inboxStore.loadInbox();

    await inboxStore.loadMoreInbox();
    await inboxStore.loadMoreInbox();

    expect(inboxStore.getState().items.map((i) => i.notificationId)).toEqual(['a', 'b']);
    expect(inboxStore.getState().page).toBe(1);
    expect(mockGet).toHaveBeenCalledWith('/api/me/notifications', { params: { query: { page: 1, size: 20 } } });
    expect(mockGet.mock.calls.filter(([path]) => path === '/api/me/notifications')).toHaveLength(2);
  });

  it('keeps the listed items when a later page fails', async () => {
    stubGets({ pages: [{ items: [item('a', '2026-09-28T10:00:00Z')], hasMore: true }] });
    await inboxStore.loadInbox();
    mockGet.mockResolvedValueOnce({ data: undefined, error: {}, response: { status: 503 } });

    await inboxStore.loadMoreInbox();

    expect(inboxStore.getState().items).toHaveLength(1);
    expect(inboxStore.getState().status).toBe('idle');
  });

  it('marks an item read optimistically and decrements the badge', async () => {
    stubGets({ count: 1, pages: [{ items: [item('a', '2026-09-28T10:00:00Z')], hasMore: false }] });
    await inboxStore.loadInbox();
    await flush();
    mockPost.mockResolvedValue({ error: undefined, response: { status: 204 } });

    await inboxStore.markNotificationRead('a');

    expect(inboxStore.getState().items[0].read).toBe(true);
    expect(inboxStore.getState().unreadCount).toBe(0);
    expect(mockPost).toHaveBeenCalledWith('/api/me/notifications/{notificationId}/read', {
      params: { path: { notificationId: 'a' } },
    });
  });

  it('rolls a failed read back', async () => {
    stubGets({ count: 1, pages: [{ items: [item('a', '2026-09-28T10:00:00Z')], hasMore: false }] });
    await inboxStore.loadInbox();
    await flush();
    mockPost.mockResolvedValue({ error: { code: 'X' }, response: { status: 503 } });

    await inboxStore.markNotificationRead('a');

    expect(inboxStore.getState().items[0].read).toBe(false);
    expect(inboxStore.getState().unreadCount).toBe(1);
  });

  it('does not call the backend for an item already read', async () => {
    stubGets({ pages: [{ items: [item('a', '2026-09-28T10:00:00Z', true)], hasMore: false }] });
    await inboxStore.loadInbox();

    await inboxStore.markNotificationRead('a');

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('re-reads the count after marking a notification that is not listed (a tapped push)', async () => {
    stubGets({ count: 3 });
    mockPost.mockResolvedValue({ error: undefined, response: { status: 204 } });

    await inboxStore.markNotificationRead('from-push');
    await flush();

    expect(mockGet).toHaveBeenCalledWith('/api/me/notifications/unread-count');
    expect(inboxStore.getState().unreadCount).toBe(3);
  });

  it('marks all read up to when the list was loaded', async () => {
    stubGets({
      count: 2,
      pages: [{ items: [item('a', '2026-01-01T10:00:00Z'), item('b', '2026-01-01T09:00:00Z')], hasMore: false }],
    });
    await inboxStore.loadInbox();
    await flush();
    const { loadedAt } = inboxStore.getState();
    mockPost.mockResolvedValue({ error: undefined, response: { status: 204 } });
    stubGets({ count: 0 });

    await inboxStore.markAllNotificationsRead();
    await flush();

    expect(mockPost).toHaveBeenCalledWith('/api/me/notifications/read-all', { body: { before: loadedAt } });
    expect(inboxStore.getState().items.every((i) => i.read)).toBe(true);
    expect(inboxStore.getState().unreadCount).toBe(0);
  });

  it('rolls a failed mark-all back', async () => {
    stubGets({ count: 1, pages: [{ items: [item('a', '2026-01-01T10:00:00Z')], hasMore: false }] });
    await inboxStore.loadInbox();
    await flush();
    mockPost.mockRejectedValue(new Error('offline'));

    await inboxStore.markAllNotificationsRead();

    expect(inboxStore.getState().items[0].read).toBe(false);
    expect(inboxStore.getState().unreadCount).toBe(1);
  });

  it('keeps the last known count when the refresh fails', async () => {
    stubGets({ count: 4 });
    await inboxStore.refreshUnreadCount();
    mockGet.mockRejectedValue(new Error('offline'));

    await inboxStore.refreshUnreadCount();

    expect(inboxStore.getState().unreadCount).toBe(4);
  });

  it('forgets the inbox on sign-out', async () => {
    stubGets({ count: 5, pages: [{ items: [item('a', '2026-09-28T10:00:00Z')], hasMore: false }] });
    await inboxStore.loadInbox();
    await flush();

    mockAuthState.mockReturnValue({ status: 'signedOut' });
    authListener?.();
    mockAuthState.mockReturnValue({ status: 'signedIn' });
    authListener?.();

    expect(inboxStore.getState().items).toEqual([]);
    expect(inboxStore.getState().unreadCount).toBe(0);
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const listener = jest.fn();
    const unsubscribe = inboxStore.subscribe(listener);
    stubGets({ count: 1 });

    await inboxStore.refreshUnreadCount();
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsubscribe();
    inboxStore.resetInbox();
    expect(listener).not.toHaveBeenCalled();
  });
});
