import createClient, { type Middleware } from 'openapi-fetch';

import { ensureFreshAccessToken, refreshAccessToken } from '@/core/auth/authStore';
import { env } from '@/core/config/env';
import type { paths } from '@/core/api/generated/schema';

/**
 * Centralizes authenticated API communication (README's "Token Handling"
 * rule) — feature code calls `bffClient.GET(...)` etc. and never builds an
 * Authorization header itself.
 */
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const accessToken = await ensureFreshAccessToken();
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return request;
  },

  async onResponse({ request, response }) {
    if (response.status !== 401) {
      return response;
    }
    // The access token looked fresh but the BFF rejected it anyway (e.g.
    // clock skew, revoked session) — refresh once and retry, rather than
    // surfacing a 401 the proactive refresh in onRequest should have avoided.
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      return response;
    }
    const retryRequest = request.clone();
    retryRequest.headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(retryRequest);
  },
};

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * A hung request to the BFF (dead connection, carrier/firewall issue) would
 * otherwise leave every screen's isLoading stuck true forever with nothing
 * to throw or log — see core/auth/authStore.ts's KEYCLOAK_REQUEST_TIMEOUT_MS
 * for the equivalent problem on the auth side. AbortController both rejects
 * the caller's promise and actually cancels the underlying connection,
 * unlike a bare Promise.race timeout.
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const bffClient = createClient<paths>({ baseUrl: env.bffBaseUrl, fetch: fetchWithTimeout });
bffClient.use(authMiddleware);
