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
      // Returning the response unmodified (rather than passing it through)
      // trips openapi-fetch's `result instanceof Response` check on React
      // Native, where the global fetch/Response the runtime hands back
      // isn't always the same Response class openapi-fetch itself sees —
      // returning nothing tells it "unchanged", skipping that check.
      return;
    }
    // The access token looked fresh but the BFF rejected it anyway (e.g.
    // clock skew, revoked session) — refresh once and retry, rather than
    // surfacing a 401 the proactive refresh in onRequest should have avoided.
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      return;
    }
    const retryRequest = request.clone();
    retryRequest.headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(retryRequest);
  },
};

const REQUEST_TIMEOUT_MS = 15_000;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/**
 * A hung request to the BFF (dead connection, carrier/firewall issue) would
 * otherwise leave every screen's isLoading stuck true forever with nothing
 * to throw or log — see core/auth/authStore.ts's KEYCLOAK_REQUEST_TIMEOUT_MS
 * for the equivalent problem on the auth side. AbortController both rejects
 * the caller's promise and actually cancels the underlying connection,
 * unlike a bare Promise.race timeout.
 *
 * The rejection is also relabeled with the request URL and failure reason —
 * a bare fetch() failure on native surfaces as an opaque "Aborted" /
 * "Network request failed" with no indication of which host it was talking
 * to, which is unreadable in a screen's error banner on a device we can't
 * attach a debugger to.
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  return fetch(input, { ...init, signal: controller.signal })
    .catch((err) => {
      const url = requestUrl(input);
      if (timedOut) {
        throw new Error(`Request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      throw new Error(`Request to ${url} failed (${reason})`);
    })
    .finally(() => clearTimeout(timer));
};

export const bffClient = createClient<paths>({ baseUrl: env.bffBaseUrl, fetch: fetchWithTimeout });
bffClient.use(authMiddleware);
