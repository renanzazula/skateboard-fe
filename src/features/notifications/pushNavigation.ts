import { router } from 'expo-router';

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
 * `/video/[slug]` rather than `/(tabs)/podcast/[slug]`: it sits above the tab
 * navigator, and its screen already handles being the first entry on the stack
 * — which is exactly the case here, since opening from a notification is often
 * a cold start with nothing to go back to.
 */
export function openNotificationTarget(data: NotificationTarget | undefined): void {
  if (!data) return;

  switch (data.targetType) {
    case 'PODCAST': {
      // The route is keyed by slug; an id would 404 the detail screen.
      if (!data.targetSlug) return;
      router.push(`/video/${data.targetSlug}`);
      return;
    }
    default:
      // An unknown target means the app is older than the notification that
      // produced it. Doing nothing leaves the user where they were, which
      // beats navigating somewhere arbitrary.
      return;
  }
}
