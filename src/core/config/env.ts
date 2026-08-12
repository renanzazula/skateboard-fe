/**
 * Public runtime configuration, injected via Expo's `EXPO_PUBLIC_*` env
 * convention (baked into the JS bundle at build time, safe to expose — the
 * Keycloak client below is a public OIDC client with no secret).
 *
 * Defaults target the local dev topology documented in DEVELOPMENT.md:
 * Keycloak on :8180, skateboard-podcast-be on :8080, skateboard-ui-backend
 * (the BFF this app talks to) on :8090.
 *
 * Android emulator gotcha: the emulator's `localhost` is its own loopback,
 * not the host machine's — use `10.0.2.2` instead of `localhost` in both
 * URLs below when running on an Android emulator (physical devices need the
 * dev machine's LAN IP instead).
 */
export const env = {
  keycloakIssuer:
    process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? 'http://localhost:8180/realms/skateboard-podcast',
  keycloakClientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'skateboard-podcast-fe',
  bffBaseUrl: process.env.EXPO_PUBLIC_BFF_BASE_URL ?? 'http://localhost:8090',
} as const;
