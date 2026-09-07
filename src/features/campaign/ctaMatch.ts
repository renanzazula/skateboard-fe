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
 * Maps a backend internal target onto the app's real expo-router path. Every
 * entry in the V1 allow-list (INTERNAL_CTA_PREFIXES) has a mapping here, so an
 * allow-listed target never silently no-ops. A null return means the target
 * passed the allow-list but this app version has no route for it — only
 * possible if the two lists drift (there's a test guarding that).
 */
export function toAppRoute(target: string): string | null {
  if (target === '/home' || target.startsWith('/home/')) return '/';
  if (target === '/podcasts') return '/podcast';
  if (target.startsWith('/podcasts/')) return `/podcast/${target.slice('/podcasts/'.length)}`;
  if (target === '/settings/about-us' || target.startsWith('/settings/about-us')) return '/settings/about-us';
  return null;
}
