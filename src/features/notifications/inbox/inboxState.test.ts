import {
  appendPage,
  countUnread,
  formatBadgeCount,
  markItemRead,
  markItemsReadUpTo,
  relativeTime,
} from '@/features/notifications/inbox/inboxState';
import type { InboxItem } from '@/features/notifications/inbox/types';

function item(id: string, createdAt: string, read = false): InboxItem {
  return {
    notificationId: id,
    type: 'NEW_PODCAST',
    title: `Title ${id}`,
    body: 'Body',
    data: {},
    createdAt,
    readAt: read ? createdAt : null,
    read,
  };
}

describe('appendPage', () => {
  it('drops items the previous page already listed', () => {
    const merged = appendPage(
      [item('a', '2026-09-28T10:00:00Z'), item('b', '2026-09-28T09:00:00Z')],
      [item('b', '2026-09-28T09:00:00Z'), item('c', '2026-09-28T08:00:00Z')]
    );

    expect(merged.map((i) => i.notificationId)).toEqual(['a', 'b', 'c']);
  });
});

describe('markItemRead', () => {
  it('marks only the matching unread item', () => {
    const items = [item('a', '2026-09-28T10:00:00Z'), item('b', '2026-09-28T09:00:00Z')];

    const next = markItemRead(items, 'a', '2026-09-28T11:00:00Z');

    expect(next[0]).toMatchObject({ read: true, readAt: '2026-09-28T11:00:00Z' });
    expect(next[1].read).toBe(false);
  });

  it('keeps the original read time of an already-read item', () => {
    const items = [item('a', '2026-09-28T10:00:00Z', true)];

    expect(markItemRead(items, 'a', '2026-09-28T11:00:00Z')[0].readAt).toBe('2026-09-28T10:00:00Z');
  });
});

describe('markItemsReadUpTo', () => {
  it('leaves items received after the cut-off unread', () => {
    const items = [item('late', '2026-09-28T10:05:00Z'), item('seen', '2026-09-28T09:00:00Z')];

    const next = markItemsReadUpTo(items, '2026-09-28T10:00:00Z', '2026-09-28T10:06:00Z');

    expect(next.find((i) => i.notificationId === 'late')?.read).toBe(false);
    expect(next.find((i) => i.notificationId === 'seen')?.read).toBe(true);
    expect(countUnread(next)).toBe(1);
  });
});

describe('formatBadgeCount', () => {
  it.each([
    [0, ''],
    [-1, ''],
    [Number.NaN, ''],
    [6, '6'],
    [99, '99'],
    [100, '99+'],
  ])('formats %p as %p', (count, expected) => {
    expect(formatBadgeCount(count)).toBe(expected);
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');

  it.each([
    ['2026-09-28T11:59:30Z', { unit: 'now' }],
    ['2026-09-28T12:05:00Z', { unit: 'now' }],
    ['not a date', { unit: 'now' }],
    ['2026-09-28T11:45:00Z', { unit: 'minutes', count: 15 }],
    ['2026-09-28T09:00:00Z', { unit: 'hours', count: 3 }],
    ['2026-09-24T12:00:00Z', { unit: 'days', count: 4 }],
    ['2026-09-07T12:00:00Z', { unit: 'weeks', count: 3 }],
    ['2026-07-01T12:00:00Z', { unit: 'date' }],
  ])('buckets %p', (iso, expected) => {
    expect(relativeTime(iso, now)).toEqual(expected);
  });
});
