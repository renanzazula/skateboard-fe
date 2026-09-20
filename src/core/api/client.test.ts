jest.mock('@/core/auth/authStore', () => ({
  ensureFreshAccessToken: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

jest.mock('@/core/config/env', () => ({
  env: { bffBaseUrl: 'https://bff.example' },
}));

import { ensureFreshAccessToken, refreshAccessToken } from '@/core/auth/authStore';
import { bffClient } from '@/core/api/client';

const mockEnsureFreshAccessToken = ensureFreshAccessToken as jest.Mock;
const mockRefreshAccessToken = refreshAccessToken as jest.Mock;

// bffClient itself carries no per-test mutable state (it's just a
// request/response pipe), so there is no need for the jest.resetModules()
// dance used for the module-level *stores* elsewhere in core/ — the same
// client instance can be reused across tests with the mocks reconfigured.
function setup() {
  return { bffClient };
}

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('bffClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureFreshAccessToken.mockResolvedValue(null);
    mockRefreshAccessToken.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('authMiddleware.onRequest', () => {
    it('attaches an Authorization header when a fresh access token is available', async () => {
      mockEnsureFreshAccessToken.mockResolvedValue('access-token-1');
      global.fetch = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
      const { bffClient } = setup();

      await bffClient.GET('/api/config');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [request] = (global.fetch as jest.Mock).mock.calls[0];
      expect(request.headers.get('Authorization')).toBe('Bearer access-token-1');
    });

    it('sends no Authorization header when there is no fresh access token', async () => {
      mockEnsureFreshAccessToken.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
      const { bffClient } = setup();

      await bffClient.GET('/api/config');

      const [request] = (global.fetch as jest.Mock).mock.calls[0];
      expect(request.headers.get('Authorization')).toBeNull();
    });
  });

  describe('authMiddleware.onResponse', () => {
    it('passes non-401 responses through unmodified', async () => {
      mockEnsureFreshAccessToken.mockResolvedValue('access-token-1');
      global.fetch = jest.fn().mockResolvedValue(jsonResponse({ loginTitle: 'Skateboard' }));
      const { bffClient } = setup();

      const { data, error } = await bffClient.GET('/api/config');

      expect(data).toEqual({ loginTitle: 'Skateboard' });
      expect(error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    });

    it('retries once with a refreshed token after a 401', async () => {
      mockEnsureFreshAccessToken.mockResolvedValue('stale-token');
      mockRefreshAccessToken.mockResolvedValue('fresh-token');
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, { status: 401 }))
        .mockResolvedValueOnce(jsonResponse({ loginTitle: 'Skateboard' }));
      const { bffClient } = setup();

      const { data } = await bffClient.GET('/api/config');

      expect(data).toEqual({ loginTitle: 'Skateboard' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const retryRequest = (global.fetch as jest.Mock).mock.calls[1][0];
      expect(retryRequest.headers.get('Authorization')).toBe('Bearer fresh-token');
    });

    it('returns the original 401 response when the refresh fails to produce a token', async () => {
      mockEnsureFreshAccessToken.mockResolvedValue('stale-token');
      mockRefreshAccessToken.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValue(jsonResponse({ message: 'unauthorized' }, { status: 401 }));
      const { bffClient } = setup();

      const { error, response } = await bffClient.GET('/api/config');

      expect(response.status).toBe(401);
      expect(error).toEqual({ message: 'unauthorized' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchWithTimeout', () => {
    it('relabels a network failure with the request URL and reason', async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
      const { bffClient } = setup();

      await expect(bffClient.GET('/api/config')).rejects.toThrow(
        /Request to https:\/\/bff\.example\/api\/config failed \(TypeError: Network request failed\)/
      );
    });

    it('reports a timeout distinctly from a plain failure once the request runs past its deadline', async () => {
      jest.useFakeTimers();
      global.fetch = jest.fn().mockImplementation(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          })
      );
      const { bffClient } = setup();

      const pending = bffClient.GET('/api/config');
      const assertion = expect(pending).rejects.toThrow(
        /Request to https:\/\/bff\.example\/api\/config timed out after 15000ms/
      );

      await jest.advanceTimersByTimeAsync(15_000);
      await assertion;
    });
  });
});
