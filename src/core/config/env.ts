import Constants from 'expo-constants';

/**
 * Public runtime configuration, injected via Expo's `EXPO_PUBLIC_*` env
 * convention (baked into the JS bundle at build time, safe to expose — the
 * Keycloak client below is a public OIDC client with no secret).
 *
 * Defaults target the local dev topology documented in DEVELOPMENT.md:
 * Keycloak on :8180, skateboard-podcast-be on :8080, skateboard-ui-backend
 * (the BFF this app talks to) on :8090.
 */

/**
 * The host the dev machine is reachable at from wherever this bundle is
 * running, or null outside `expo start`.
 *
 * `localhost` is a self-reference, so it only means "the dev machine" for
 * bundles that execute *on* the dev machine — the web build and the iOS
 * Simulator. On an Android emulator or a physical device it resolves to that
 * device's own loopback, and every request to a locally-run backend fails
 * while the web build keeps working, which makes it look like a client bug
 * rather than a wrong address.
 *
 * Metro already knows the right host — it had to, to serve this bundle — and
 * publishes it as `hostUri` ("host:port", @expo/cli dev only, hence the
 * production fallback below).
 */
function devHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  // Strip Metro's own port, and any scheme/path if a future CLI adds one.
  // Bracketed IPv6 literals keep their brackets; only a trailing :port goes.
  const host = hostUri.replace(/^\w+:\/\//, '').split('/')[0];
  return host.replace(/:\d+$/, '') || null;
}

function localBackend(port: number, fallbackHost = 'localhost'): string {
  return `http://${devHost() ?? fallbackHost}:${port}`;
}

export const env = {
  /**
   * Not derived from the dev host: this exact string is the `iss` claim of
   * every token Keycloak mints, and all three backends reject tokens whose
   * issuer doesn't match their own `APP_SECURITY_OAUTH2_ISSUER_URI`. Point
   * the app at a different host than the backends expect and login succeeds
   * but every API call 401s. Change it here and in the backends together.
   */
  keycloakIssuer:
    process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? 'http://localhost:8180/realms/skateboard-podcast',
  keycloakClientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'skateboard-podcast-fe',
  bffBaseUrl: process.env.EXPO_PUBLIC_BFF_BASE_URL ?? localBackend(8090),
} as const;
