import * as AuthSessionActual from 'expo-auth-session';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    deleteItem: jest.fn(),
  },
}));

jest.mock('@/features/notifications/deviceIdentifier', () => ({
  forgetCachedDeviceIdentifier: jest.fn(),
}));

jest.mock('@/features/notifications/pushRegistration', () => ({
  resetPushRegistrationState: jest.fn(),
  unregisterPushDevice: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-auth-session', () => {
  const actual = jest.requireActual('expo-auth-session');
  return {
    ...actual,
    fetchDiscoveryAsync: jest.fn(),
    refreshAsync: jest.fn(),
    makeRedirectUri: jest.fn(() => 'skateboardfe://oauthredirect'),
    exchangeCodeAsync: jest.fn(),
    TokenRequest: jest.fn(),
    AuthRequest: jest.fn(),
  };
});

const DISCOVERY = { endSessionEndpoint: 'https://kc.example/end-session' };

function makeToken(overrides: Partial<{ accessToken: string; expiresIn: number; refreshToken: string }> = {}) {
  return {
    accessToken:
      overrides.accessToken ??
      'header.' + Buffer.from(JSON.stringify({ authorities: ['ROLE_ADMIN'], email: 'a@b.com' })).toString('base64') + '.sig',
    expiresIn: overrides.expiresIn ?? 900,
    refreshToken: overrides.refreshToken ?? 'new-refresh-token',
  };
}

// jest.resetModules() below forces authStore (and everything it imports) to
// be re-required fresh for every test, so it starts with a clean module-level
// `state`. That also re-runs the jest.mock() factories above, producing brand
// new jest.fn() instances each time — so the mocked deps must be re-required
// *after* resetModules() in each test rather than captured once at module
// scope, or assertions/config would target a stale, disconnected mock.
function setup() {
  jest.resetModules();
  const { secureStorage } = require('@/core/storage/secureStorage');
  const AuthSession = require('expo-auth-session') as typeof AuthSessionActual;
  const { forgetCachedDeviceIdentifier } = require('@/features/notifications/deviceIdentifier');
  const { resetPushRegistrationState, unregisterPushDevice } = require('@/features/notifications/pushRegistration');

  secureStorage.getItem.mockResolvedValue(null);
  secureStorage.setItem.mockResolvedValue(undefined);
  secureStorage.deleteItem.mockResolvedValue(undefined);
  (AuthSession.fetchDiscoveryAsync as jest.Mock).mockResolvedValue(DISCOVERY);
  (AuthSession.refreshAsync as jest.Mock).mockResolvedValue(makeToken());
  unregisterPushDevice.mockResolvedValue(undefined);

  const authStore = require('@/core/auth/authStore') as typeof import('@/core/auth/authStore');

  return { authStore, secureStorage, AuthSession, forgetCachedDeviceIdentifier, resetPushRegistrationState, unregisterPushDevice };
}

describe('authStore', () => {
  describe('bootstrap', () => {
    it('signs out locally when there is no stored refresh token', async () => {
      const { authStore, secureStorage } = setup();
      await authStore.bootstrap();
      expect(authStore.getState().status).toBe('signedOut');
      expect(secureStorage.deleteItem).toHaveBeenCalledWith('skateboard.refreshToken');
    });

    it('signs in from a valid stored refresh token', async () => {
      const { authStore, secureStorage } = setup();
      secureStorage.getItem.mockResolvedValueOnce('stored-refresh-token');

      await authStore.bootstrap();

      const state = authStore.getState();
      expect(state.status).toBe('signedIn');
      expect(state.authorities).toEqual(['ROLE_ADMIN']);
      expect(state.email).toBe('a@b.com');
      expect(secureStorage.setItem).toHaveBeenCalledWith('skateboard.refreshToken', 'new-refresh-token');
    });

    it('signs out when Keycloak rejects the refresh token', async () => {
      const { authStore, secureStorage, AuthSession } = setup();
      secureStorage.getItem.mockResolvedValueOnce('stored-refresh-token');
      (AuthSession.refreshAsync as jest.Mock).mockRejectedValueOnce(new AuthSession.TokenError({ error: 'invalid_grant' }));

      await authStore.bootstrap();

      expect(authStore.getState().status).toBe('signedOut');
      expect(secureStorage.deleteItem).toHaveBeenCalledWith('skateboard.refreshToken');
    });

    it('leaves the stored token intact on a transient network failure', async () => {
      const { authStore, secureStorage, AuthSession } = setup();
      secureStorage.getItem.mockResolvedValueOnce('stored-refresh-token');
      (AuthSession.refreshAsync as jest.Mock).mockRejectedValueOnce(new Error('network down'));

      await authStore.bootstrap();

      expect(authStore.getState().status).toBe('signedOut');
      expect(secureStorage.deleteItem).not.toHaveBeenCalled();
    });
  });

  describe('loginWithPassword', () => {
    it('applies the returned token response', async () => {
      const { authStore, AuthSession } = setup();
      const performAsync = jest.fn().mockResolvedValue(makeToken());
      (AuthSession.TokenRequest as unknown as jest.Mock).mockImplementation(() => ({ performAsync }));

      await authStore.loginWithPassword('user', 'pass');

      expect(performAsync).toHaveBeenCalledWith(DISCOVERY);
      expect(authStore.getState().status).toBe('signedIn');
    });

    it('propagates a rejected login', async () => {
      const { authStore, AuthSession } = setup();
      const performAsync = jest.fn().mockRejectedValue(new AuthSession.TokenError({ error: 'invalid_grant' }));
      (AuthSession.TokenRequest as unknown as jest.Mock).mockImplementation(() => ({ performAsync }));

      await expect(authStore.loginWithPassword('user', 'wrong')).rejects.toThrow();
    });
  });

  describe('loginWithGoogle', () => {
    it('exchanges the auth code for a token on success', async () => {
      const { authStore, AuthSession } = setup();
      const promptAsync = jest.fn().mockResolvedValue({ type: 'success', params: { code: 'auth-code' } });
      (AuthSession.AuthRequest as unknown as jest.Mock).mockImplementation(() => ({
        promptAsync,
        codeVerifier: 'verifier',
      }));
      (AuthSession.exchangeCodeAsync as jest.Mock).mockResolvedValue(makeToken());

      await authStore.loginWithGoogle();

      expect(AuthSession.exchangeCodeAsync).toHaveBeenCalled();
      expect(authStore.getState().status).toBe('signedIn');
    });

    it('does nothing when the user cancels', async () => {
      const { authStore, AuthSession } = setup();
      const promptAsync = jest.fn().mockResolvedValue({ type: 'cancel' });
      (AuthSession.AuthRequest as unknown as jest.Mock).mockImplementation(() => ({ promptAsync, codeVerifier: null }));

      await authStore.loginWithGoogle();

      expect(authStore.getState().status).toBe('loading');
      expect(AuthSession.exchangeCodeAsync).not.toHaveBeenCalled();
    });

    it('throws a descriptive error when the flow errors out', async () => {
      const { authStore, AuthSession } = setup();
      const promptAsync = jest
        .fn()
        .mockResolvedValue({ type: 'error', params: { error_description: 'access_denied' } });
      (AuthSession.AuthRequest as unknown as jest.Mock).mockImplementation(() => ({ promptAsync, codeVerifier: null }));

      await expect(authStore.loginWithGoogle()).rejects.toThrow('access_denied');
    });
  });

  describe('logout', () => {
    it('unregisters push, clears local state, and calls the end-session endpoint', async () => {
      const { authStore, secureStorage, forgetCachedDeviceIdentifier, resetPushRegistrationState, unregisterPushDevice } = setup();
      secureStorage.getItem.mockResolvedValueOnce('stored-refresh-token');
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await authStore.logout();

      expect(unregisterPushDevice).toHaveBeenCalled();
      expect(forgetCachedDeviceIdentifier).toHaveBeenCalled();
      expect(resetPushRegistrationState).toHaveBeenCalled();
      expect(authStore.getState().status).toBe('signedOut');
      expect(global.fetch).toHaveBeenCalledWith(
        DISCOVERY.endSessionEndpoint,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('still signs out locally when discovery fails', async () => {
      const { authStore, AuthSession } = setup();
      (AuthSession.fetchDiscoveryAsync as jest.Mock).mockRejectedValueOnce(new Error('discovery down'));
      global.fetch = jest.fn();

      await authStore.logout();

      expect(authStore.getState().status).toBe('signedOut');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('coalesces concurrent callers into a single request', async () => {
      const { authStore, secureStorage, AuthSession } = setup();
      secureStorage.getItem.mockResolvedValue('stored-refresh-token');

      const [a, b] = await Promise.all([authStore.refreshAccessToken(), authStore.refreshAccessToken()]);

      expect(a).toBe(b);
      expect(AuthSession.refreshAsync).toHaveBeenCalledTimes(1);
    });

    it('returns null and signs out when there is no stored refresh token', async () => {
      const { authStore, secureStorage } = setup();
      secureStorage.getItem.mockResolvedValue(null);

      const result = await authStore.refreshAccessToken();

      expect(result).toBeNull();
      expect(authStore.getState().status).toBe('signedOut');
    });
  });

  describe('ensureFreshAccessToken', () => {
    it('returns null when signed out', async () => {
      const { authStore } = setup();
      await expect(authStore.ensureFreshAccessToken()).resolves.toBeNull();
    });

    it('returns the current access token when it is not close to expiring', async () => {
      const { authStore, secureStorage, AuthSession } = setup();
      secureStorage.getItem.mockResolvedValueOnce('stored-refresh-token');
      await authStore.bootstrap();

      const token = await authStore.ensureFreshAccessToken();

      expect(token).toBe(authStore.getState().accessToken);
      expect(AuthSession.refreshAsync).toHaveBeenCalledTimes(1); // only the bootstrap refresh
    });

    it('proactively refreshes when the token is about to expire', async () => {
      const { authStore, secureStorage, AuthSession } = setup();
      secureStorage.getItem.mockResolvedValue('stored-refresh-token');
      (AuthSession.refreshAsync as jest.Mock).mockResolvedValueOnce(makeToken({ expiresIn: 1 })); // expires almost immediately

      await authStore.bootstrap();
      await authStore.ensureFreshAccessToken();

      expect(AuthSession.refreshAsync).toHaveBeenCalledTimes(2); // bootstrap + proactive refresh
    });
  });

  describe('subscribe', () => {
    it('notifies subscribers on state changes and can unsubscribe', async () => {
      const { authStore } = setup();
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      const listener = jest.fn();
      const unsubscribe = authStore.subscribe(listener);

      await authStore.logout();
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      listener.mockClear();
      await authStore.logout();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
