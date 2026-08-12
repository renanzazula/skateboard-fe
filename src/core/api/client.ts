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

export const bffClient = createClient<paths>({ baseUrl: env.bffBaseUrl });
bffClient.use(authMiddleware);
