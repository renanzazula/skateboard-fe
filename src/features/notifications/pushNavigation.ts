import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * The mapping from a notification's semantic target to a route.
 *
 * The backend deliberately sends {targetType, targetSlug} rather than a URL,
 * so this mapping lives with the router that owns it: changing where podcasts
 * live is a frontend release, not a backend one.
 */
export interface NotificationTarget {
  targetType?: string;
  targetId?: string;
  targetSlug?: string;
}

/**
 * Where a navigation came from. `push` is a tap on an OS notification, which
 * is often a cold start with nothing behind the episode screen; `inbox` is a
 * tap in the in-app list, which the user should be able to go back to.
 */
export type NotificationSource = 'push' | 'inbox';

/**
 * podcast-be's slugging rule (lowercase, runs of anything else collapsed to
 * `-`) can only produce this. Anything else in `targetSlug` is not a slug we
 * issued, and pushing it into a route would at best 404.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The target, if the app knows how to open it. `null` means "don't navigate"
 * — the user stays on whatever screen they would have landed on anyway, which
 * for a cold start is Home. That is the fallback for malformed data, a
 * notification from before targets carried a slug, and a target type newer
 * than this build.
 */
export function parseNotificationTarget(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== 'object') return null;
  const { targetType, targetId, targetSlug } = data as Record<string, unknown>;

  switch (targetType) {
    case 'PODCAST':
      // The route is keyed by slug; an id would 404 the detail screen.
      if (typeof targetSlug !== 'string' || !SLUG_PATTERN.test(targetSlug)) return null;
      return {
        targetType,
        targetSlug,
        targetId: typeof targetId === 'string' ? targetId : undefined,
      };
    default:
      return null;
  }
}

/**
 * `/video/[slug]` rather than `/(tabs)/podcast/[slug]`: it sits above the tab
 * navigator, and its screen already handles being the first entry on the stack
 * — which is exactly the case here, since opening from a notification is often
 * a cold start with nothing to go back to.
 *
 * `source` rides along as a route param so the episode screen can tell a
 * notification whose episode has since been deleted (send the user Home) from
 * an ordinary missing post.
 */
export function openNotificationTarget(data: unknown, source: NotificationSource = 'inbox'): void {
  const target = parseNotificationTarget(data);
  if (!target) return;

  switch (target.targetType) {
    case 'PODCAST':
      router.push({ pathname: '/video/[slug]', params: { slug: target.targetSlug!, source } });
      return;
  }
}

// ---------------------------------------------------------------------------
// Pending push target
//
// A tap is captured by PushNotificationsGate, which sits outside the
// navigator, often before it can navigate at all: on a cold start the tap is
// there on the first render, while the session is still being restored and
// video/[slug] is still behind Stack.Protected. Pushing then was dropped and
// the app opened on Home — the bug this exists to fix. So the gate only
// records the target here, and the root navigator opens it once it is ready
// (see useOpenPendingNotificationTarget).
// ---------------------------------------------------------------------------

let pendingTarget: NotificationTarget | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A newer tap replaces an older one that has not been opened yet. */
export function setPendingNotificationTarget(target: NotificationTarget | null): void {
  pendingTarget = target;
  emit();
}

export function getPendingNotificationTarget(): NotificationTarget | null {
  return pendingTarget;
}

/**
 * Opens the pending push target once `canNavigate` is true — the caller's
 * statement that the user is signed in and the stack is showing — and the
 * root navigator has mounted (navigating before that is an error in
 * expo-router). Consumed exactly once, so a re-render or a later auth change
 * cannot re-open it.
 */
export function useOpenPendingNotificationTarget(canNavigate: boolean): void {
  const target = useSyncExternalStore(subscribe, getPendingNotificationTarget, getPendingNotificationTarget);
  const navigatorReady = !!useRootNavigationState()?.key;

  useEffect(() => {
    if (!canNavigate || !navigatorReady || !target) return;
    setPendingNotificationTarget(null);
    openNotificationTarget(target, 'push');
  }, [canNavigate, navigatorReady, target]);
}
