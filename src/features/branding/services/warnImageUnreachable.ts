import { Platform } from 'react-native';

/** Hosts that mean "whichever machine is asking" rather than a fixed address. */
const LOOPBACK = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

/**
 * Host of an absolute http(s) URL, or null if it isn't one.
 *
 * Deliberately not `new URL()`: React Native's built-in is a partial
 * implementation and doesn't expose `.hostname` reliably across platforms.
 */
function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/?#]+)/i.exec(url);
  if (!match) return null;
  // Drop credentials and port; keep an IPv6 literal's brackets intact.
  const authority = match[1].replace(/^[^@]*@/, '');
  const bracketed = /^\[([^\]]+)\]/.exec(authority);
  return bracketed ? bracketed[1] : authority.split(':')[0];
}

/**
 * Logs a branding image that failed to load, naming the likely cause.
 *
 * These images are presigned URLs from GET /api/config, and both the login
 * background and the logo render conditionally — so every failure (unset,
 * expired, unreachable) otherwise looks identical on screen: nothing, no
 * error. That makes the single most common cause hard to spot, because it
 * only reproduces on some platforms.
 *
 * A loopback host in the URL is a self-reference. It points at the dev
 * machine for a bundle running there (web, iOS Simulator) and at the device
 * itself everywhere else, so the same config leaves web working and native
 * blank. The host is baked in by skateboard-app-config-be's AWS_ENDPOINT_URL
 * and can't be corrected here — SigV4 signs the Host header, so rewriting it
 * would invalidate the signature and earn a 403 instead.
 */
export function warnImageUnreachable(label: string, url: string, error: string): void {
  const host = hostOf(url);

  if (host && LOOPBACK.includes(host) && Platform.OS !== 'web') {
    console.warn(
      `[branding] ${label} failed to load: its URL points at "${host}", which on ` +
        `${Platform.OS} means this device, not your dev machine. Restart ` +
        `skateboard-app-config-be with AWS_ENDPOINT_URL set to a LAN address ` +
        `(or 10.0.2.2 on an Android emulator). Underlying error: ${error}`,
    );
    return;
  }

  console.warn(`[branding] ${label} failed to load from ${host ?? url}: ${error}`);
}
