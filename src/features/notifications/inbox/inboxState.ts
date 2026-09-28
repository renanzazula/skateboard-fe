import type { InboxItem } from '@/features/notifications/inbox/types';

/**
 * Pure helpers behind the inbox store — no react-native, no network — so the
 * optimistic-update and paging rules are unit-testable on their own.
 */

/**
 * Appends a later page, dropping anything already listed. Offset paging
 * shifts when a notification arrives mid-scroll, so the next page can repeat
 * the last item of the previous one.
 */
export function appendPage(existing: InboxItem[], incoming: InboxItem[]): InboxItem[] {
  const seen = new Set(existing.map((item) => item.notificationId));
  return [...existing, ...incoming.filter((item) => !seen.has(item.notificationId))];
}

export function markItemRead(items: InboxItem[], notificationId: string, readAt: string): InboxItem[] {
  return items.map((item) =>
    item.notificationId === notificationId && !item.read ? { ...item, read: true, readAt } : item
  );
}

/**
 * Mirrors the backend's read-all: only what was received at or before
 * `before` — the moment the list was loaded — so a notification that arrived
 * after the user last looked stays unread.
 */
export function markItemsReadUpTo(items: InboxItem[], before: string, readAt: string): InboxItem[] {
  const cutOff = Date.parse(before);
  return items.map((item) =>
    !item.read && Date.parse(item.createdAt) <= cutOff ? { ...item, read: true, readAt } : item
  );
}

export function countUnread(items: InboxItem[]): number {
  return items.reduce((total, item) => (item.read ? total : total + 1), 0);
}

/** Badge text: nothing at zero, capped so it never outgrows the bell. */
export function formatBadgeCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count > 99 ? '99+' : String(Math.floor(count));
}

export type RelativeTime =
  | { unit: 'now' }
  | { unit: 'minutes' | 'hours' | 'days' | 'weeks'; count: number }
  | { unit: 'date' };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * "4 d ago"-style buckets, translated by the caller. Past five weeks a
 * relative age stops being useful and the caller shows the date instead.
 * A timestamp slightly in the future (client clock behind the server's) reads
 * as "now" rather than a negative age.
 */
export function relativeTime(iso: string, now: number): RelativeTime {
  const elapsed = now - Date.parse(iso);
  if (!Number.isFinite(elapsed) || elapsed < MINUTE) return { unit: 'now' };
  if (elapsed < HOUR) return { unit: 'minutes', count: Math.floor(elapsed / MINUTE) };
  if (elapsed < DAY) return { unit: 'hours', count: Math.floor(elapsed / HOUR) };
  if (elapsed < WEEK) return { unit: 'days', count: Math.floor(elapsed / DAY) };
  if (elapsed < 5 * WEEK) return { unit: 'weeks', count: Math.floor(elapsed / WEEK) };
  return { unit: 'date' };
}
