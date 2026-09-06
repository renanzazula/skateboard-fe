import { INTERNAL_CTA_PREFIXES } from '@/features/campaign/types';

/** Does `target` match the backend's internal allow-list (equals a prefix or `prefix/…`)? */
export function isAllowedInternalTarget(target: string): boolean {
  return INTERNAL_CTA_PREFIXES.some((p) => target === p || target.startsWith(`${p}/`));
}

/** Absolute http(s) URL — the backend already validates EXTERNAL targets this way. */
export function isExternalUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

/**
 * Maps a backend product-level internal target onto the app's real expo-router
 * path. The allow-list names (`/home`, `/podcasts`, …) are hand-synced with
 * skateboard-app-config-be and don't all correspond 1:1 to routes that exist
 * today — unmapped ones return null and the CTA is treated as a no-op.
 */
export function toAppRoute(target: string): string | null {
  if (target === '/home' || target.startsWith('/home/')) return '/';
  if (target === '/podcasts') return '/podcast';
  if (target.startsWith('/podcasts/')) return `/podcast/${target.slice('/podcasts/'.length)}`;
  if (target === '/settings/about-us' || target.startsWith('/settings/about-us')) return '/settings/about-us';
  // /events and /competitions have no screen in V1.
  return null;
}
