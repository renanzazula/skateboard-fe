import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { jwtDecode } from 'jwt-decode';

import { env } from '@/core/config/env';
import { secureStorage } from '@/core/storage/secureStorage';

// Required by expo-auth-session on web so the auth popup can close itself
// and hand control back to the app; a harmless no-op on native.
WebBrowser.maybeCompleteAuthSession();

const REFRESH_TOKEN_KEY = 'skateboard.refreshToken';
// Refresh a little before the access token's real expiry so a request that
// starts just before expiry doesn't race a 900s-lifespan token going stale
// mid-flight (see skateboard-podcast-be realm-export.json accessTokenLifespan).
const EXPIRY_SKEW_MS = 30_000;

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  authorities: string[];
  expiresAt: number | null;
}

let state: AuthState = { status: 'loading', accessToken: null, authorities: [], expiresAt: null };
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
}

function decodeAuthorities(accessToken: string): string[] {
  try {
    return jwtDecode<AccessTokenClaims>(accessToken).authorities ?? [];
  } catch {
    return [];
  }
}

let discoveryPromise: Promise<AuthSession.DiscoveryDocument> | null = null;
function getDiscovery(): Promise<AuthSession.DiscoveryDocument> {
  if (!discoveryPromise) {
    discoveryPromise = AuthSession.fetchDiscoveryAsync(env.keycloakIssuer);
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
    expiresAt,
  });
  // Keycloak may omit refresh_token on a refresh-grant response (reusing the
  // existing one) — only overwrite storage when a new one is actually issued.
  if (tokenResponse.refreshToken) {
    secureStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refreshToken).catch(() => {});
  }
}

async function signOutLocal(): Promise<void> {
  setState({ status: 'signedOut', accessToken: null, authorities: [], expiresAt: null });
  await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => {});
}

/** Silent sign-in from a stored refresh token. Call once at app start. */
export async function bootstrap(): Promise<void> {
  const refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    await signOutLocal();
    return;
  }
  try {
    const discovery = await getDiscovery();
    const tokenResponse = await AuthSession.refreshAsync(
      { clientId: env.keycloakClientId, refreshToken },
      discovery
    );
    applyTokenResponse(tokenResponse);
  } catch {
    await signOutLocal();
  }
}

/** Authorization Code + PKCE flow via the system browser (skateboard-podcast-fe client). */
export async function login(): Promise<boolean> {
  const discovery = await getDiscovery();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'skateboardfe' });
  const request = new AuthSession.AuthRequest({
    clientId: env.keycloakClientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== 'success') {
    return false;
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: env.keycloakClientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    discovery
  );
  applyTokenResponse(tokenResponse);
  return true;
}

/**
 * Direct Access Grant (Resource Owner Password Credentials) via the embedded
 * username/password form. Requires directAccessGrantsEnabled on the
 * skateboard-podcast-fe client. expo-auth-session's GrantType enum has no
 * "password" member, so the request is built on the generic TokenRequest
 * base class (same performAsync/TokenResponse machinery `login`/
 * `refreshAccessToken` use) with an explicit grant type cast.
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
  const tokenResponse = await request.performAsync(discovery);
  applyTokenResponse(tokenResponse);
}

/**
 * Back-channel logout — a plain POST to Keycloak's end-session endpoint with
 * the refresh token, same as `loginWithPassword` avoids the browser for
 * sign-in. No browser/webview pop-up: there's no SSO cookie session left to
 * clear now that login is Direct Access Grant rather than a browser redirect.
 */
export async function logout(): Promise<void> {
  const refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
  const discovery = await getDiscovery().catch(() => null);
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
      const tokenResponse = await AuthSession.refreshAsync(
        { clientId: env.keycloakClientId, refreshToken },
        discovery
      );
      applyTokenResponse(tokenResponse);
      return tokenResponse.accessToken;
    } catch {
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
