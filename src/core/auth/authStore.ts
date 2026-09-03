import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { jwtDecode } from 'jwt-decode';
import { Platform } from 'react-native';

import { env } from '@/core/config/env';
import { secureStorage } from '@/core/storage/secureStorage';
import { forgetCachedDeviceIdentifier } from '@/features/notifications/deviceIdentifier';
import { unregisterPushDevice } from '@/features/notifications/pushRegistration';
import { withTimeout } from '@/shared/utils/withTimeout';

// Required once at module load so the in-app browser sheet closes itself and
// resolves the pending promptAsync() promise when Keycloak redirects back —
// see loginWithGoogle() below. No-op on native, needed on web.
WebBrowser.maybeCompleteAuthSession();

const REFRESH_TOKEN_KEY = 'skateboard.refreshToken';
// Refresh a little before the access token's real expiry so a request that
// starts just before expiry doesn't race a 900s-lifespan token going stale
// mid-flight (see skateboard-podcast-be realm-export.json accessTokenLifespan).
const EXPIRY_SKEW_MS = 30_000;
// Every bffClient call awaits ensureFreshAccessToken() (see core/api/client.ts's
// authMiddleware), which can end up here — a hang in any of these Keycloak
// calls with no timeout would silently freeze every screen's data fetch at
// once, with nothing to throw or log. See core/auth/authStore.ts history.
const KEYCLOAK_REQUEST_TIMEOUT_MS = 10_000;

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  authorities: string[];
  email: string | null;
  expiresAt: number | null;
}

let state: AuthState = { status: 'loading', accessToken: null, authorities: [], email: null, expiresAt: null };
const listeners = new Set<() => void>();

function setState(next: AuthState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/** For React's useSyncExternalStore — see core/auth/useAuth.ts. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AuthState {
  return state;
}

interface AccessTokenClaims {
  // Realm-role claim populated by skateboard-podcast realm's "authorities"
  // protocol mapper — same claim name SecurityConfig on the BFF and
  // podcast-be read server-side. Decoded here for UI-only role gating
  // (tab visibility); it is never trusted as a security boundary.
  authorities?: string[];
  // Standard OIDC claim, present because `login()` requests the `email`
  // scope. /api/me has no email field (see UserResponse in
  // core/api/generated/schema.ts), so the Settings profile card reads it
  // from here instead — display-only, same as `authorities`.
  email?: string;
}

function decodeAuthorities(accessToken: string): string[] {
  try {
    return jwtDecode<AccessTokenClaims>(accessToken).authorities ?? [];
  } catch {
    return [];
  }
}

function decodeEmail(accessToken: string): string | null {
  try {
    return jwtDecode<AccessTokenClaims>(accessToken).email ?? null;
  } catch {
    return null;
  }
}

let discoveryPromise: Promise<AuthSession.DiscoveryDocument> | null = null;
function getDiscovery(): Promise<AuthSession.DiscoveryDocument> {
  if (!discoveryPromise) {
    discoveryPromise = withTimeout(
      AuthSession.fetchDiscoveryAsync(env.keycloakIssuer),
      KEYCLOAK_REQUEST_TIMEOUT_MS,
      'Keycloak discovery'
    ).catch((err) => {
      // Don't cache a hung/failed attempt forever — an app that never
      // recovers from one bad network blip otherwise needs a restart.
      discoveryPromise = null;
      throw err;
    });
  }
  return discoveryPromise;
}

function applyTokenResponse(tokenResponse: AuthSession.TokenResponse): void {
  const accessToken = tokenResponse.accessToken;
  const expiresAt = tokenResponse.expiresIn ? Date.now() + tokenResponse.expiresIn * 1000 : null;
  setState({
    status: 'signedIn',
    accessToken,
    authorities: decodeAuthorities(accessToken),
    email: decodeEmail(accessToken),
    expiresAt,
  });
  // Keycloak may omit refresh_token on a refresh-grant response (reusing the
  // existing one) — only overwrite storage when a new one is actually issued.
  if (tokenResponse.refreshToken) {
    secureStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refreshToken).catch(() => {});
  }
}

async function signOutLocal(): Promise<void> {
  setState({ status: 'signedOut', accessToken: null, authorities: [], email: null, expiresAt: null });
  await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => {});
}

/** Silent sign-in from a stored refresh token. Call once at app start. */
export async function bootstrap(): Promise<void> {
  try {
    const refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      await signOutLocal();
      return;
    }
    const discovery = await getDiscovery();
    const tokenResponse = await withTimeout(
      AuthSession.refreshAsync({ clientId: env.keycloakClientId, refreshToken }, discovery),
      KEYCLOAK_REQUEST_TIMEOUT_MS,
      'Keycloak token refresh'
    );
    applyTokenResponse(tokenResponse);
  } catch (err) {
    // Any failure here (secure-store access, discovery fetch, stale refresh
    // token) must still resolve `status` away from 'loading' — the root
    // layout keeps the splash screen up and renders nothing until it does.
    // Logged (not swallowed silently) so a real failure here is visible in
    // device logs instead of looking identical to "no stored session".
    console.warn('[auth] bootstrap failed, signing out locally', err);
    await signOutLocal();
  }
}

/**
 * Direct Access Grant (Resource Owner Password Credentials) via the embedded
 * username/password form. Requires directAccessGrantsEnabled on the
 * env.keycloakClientId client (e.g. skateboard-mobile). expo-auth-session's
 * GrantType enum has no "password" member, so the request is built on the
 * generic TokenRequest base class (same performAsync/TokenResponse
 * machinery `refreshAccessToken` uses) with an explicit grant type cast.
 */
export async function loginWithPassword(username: string, password: string): Promise<void> {
  const discovery = await getDiscovery();
  const request = new AuthSession.TokenRequest(
    {
      clientId: env.keycloakClientId,
      extraParams: { username, password },
    },
    'password' as AuthSession.GrantType
  );
  const tokenResponse = await withTimeout(
    request.performAsync(discovery),
    KEYCLOAK_REQUEST_TIMEOUT_MS,
    'Keycloak login'
  );
  applyTokenResponse(tokenResponse);
}

/**
 * Must match `expo.scheme` in app.json — this is what the OS routes back to
 * the app after the browser hands control over.
 */
const APP_SCHEME = 'skateboardfe';

/**
 * Path on the redirect URI. Without one, makeRedirectUri returns a bare
 * `skateboardfe://`, which Keycloak matches inconsistently against a
 * `skateboardfe://*` entry — the wildcard expects something after the
 * separator. An explicit segment makes the URI deterministic and matches that
 * wildcard cleanly, so the value registered on the client is unambiguous.
 */
const OAUTH_REDIRECT_PATH = 'oauthredirect';

/**
 * Federated sign-in via Keycloak's "google" identity provider (see
 * identityProviders in skateboard-podcast realm-export.json). Unlike
 * loginWithPassword(), this is a real Authorization Code + PKCE flow — Direct
 * Access Grant has no way to hand off to an external IdP — so it opens a
 * browser tab/sheet on Keycloak's authorize endpoint with kc_idp_hint=google
 * to skip straight past Keycloak's own login form into Google's.
 */
export async function loginWithGoogle(): Promise<void> {
  const discovery = await getDiscovery();
  // Native only. On web makeRedirectUri returns the current origin, which is
  // already a valid absolute URL and is what the web client has registered;
  // adding a path there would send the browser back to /oauthredirect, a
  // route this app does not define.
  const redirectUri =
    Platform.OS === 'web'
      ? AuthSession.makeRedirectUri()
      : AuthSession.makeRedirectUri({ scheme: APP_SCHEME, path: OAUTH_REDIRECT_PATH });
  const request = new AuthSession.AuthRequest({
    clientId: env.keycloakClientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    scopes: ['openid', 'profile', 'email'],
    extraParams: { kc_idp_hint: 'google' },
  });

  const result = await request.promptAsync(discovery);
  if (result.type === 'error') {
    throw new Error(result.params.error_description || result.error?.message || 'Google sign-in failed');
  }
  if (result.type !== 'success') {
    return; // user cancelled/dismissed the browser — not an error
  }

  const tokenResponse = await withTimeout(
    AuthSession.exchangeCodeAsync(
      {
        clientId: env.keycloakClientId,
        code: result.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier ?? '' },
      },
      discovery
    ),
    KEYCLOAK_REQUEST_TIMEOUT_MS,
    'Keycloak Google token exchange'
  );
  applyTokenResponse(tokenResponse);
}

/**
 * Plain POST to Keycloak's end-session endpoint with the refresh token — no
 * browser/webview involved, since sign-in never opens one either.
 */
export async function logout(): Promise<void> {
  const refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
  const discovery = await getDiscovery().catch(() => null);

  // Before signOutLocal(), which clears the access token this call needs.
  // Skipping it would leave the handset registered to the account signing
  // out, so its notifications would keep arriving — and would be shown to
  // whoever signs in next on this device. It never throws, so a sign-out is
  // never blocked by it. The involuntary sign-out paths (bootstrap() and
  // refreshAccessToken() failing) deliberately don't call this: there is no
  // valid token left to call with, and the backend releases the registration
  // anyway the next time this push token is claimed by another account.
  await unregisterPushDevice();
  forgetCachedDeviceIdentifier();

  await signOutLocal();

  if (discovery?.endSessionEndpoint && refreshToken) {
    await fetch(discovery.endSessionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.keycloakClientId, refresh_token: refreshToken }),
    }).catch(() => {});
  }
}

let refreshInFlight: Promise<string | null> | null = null;

/** Forces a refresh (e.g. after the BFF returns 401). Coalesces concurrent callers. */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      await signOutLocal();
      return null;
    }
    try {
      const discovery = await getDiscovery();
      const tokenResponse = await withTimeout(
        AuthSession.refreshAsync({ clientId: env.keycloakClientId, refreshToken }, discovery),
        KEYCLOAK_REQUEST_TIMEOUT_MS,
        'Keycloak token refresh'
      );
      applyTokenResponse(tokenResponse);
      return tokenResponse.accessToken;
    } catch (err) {
      // Logged for the same reason as bootstrap()'s catch — a silent
      // sign-out mid-session (triggered by the 401-retry path in
      // core/api/client.ts) would otherwise look identical to "content just
      // isn't loading" with nothing to explain why.
      console.warn('[auth] token refresh failed, signing out locally', err);
      await signOutLocal();
      return null;
    }
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Used by the API client (core/api/client.ts) before attaching the Authorization header. */
export async function ensureFreshAccessToken(): Promise<string | null> {
  if (state.status !== 'signedIn' || !state.accessToken) {
    return null;
  }
  const isExpiring = state.expiresAt !== null && state.expiresAt - EXPIRY_SKEW_MS < Date.now();
  return isExpiring ? refreshAccessToken() : state.accessToken;
}
