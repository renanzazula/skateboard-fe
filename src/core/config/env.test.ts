describe('env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses default values when no EXPO_PUBLIC_* vars are set and no dev hostUri is available', () => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
    delete process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER;
    delete process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_BFF_BASE_URL;
    delete process.env.EXPO_PUBLIC_CAMPAIGNS_ENABLED;

    const { env } = require('@/core/config/env');
    expect(env.keycloakIssuer).toBe('http://localhost:8180/realms/skateboard-podcast');
    expect(env.keycloakClientId).toBe('skateboard-podcast-fe');
    expect(env.bffBaseUrl).toBe('http://localhost:8090');
    expect(env.campaignsEnabled).toBe(false);
  });

  it('reads overrides from EXPO_PUBLIC_* env vars', () => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
    process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER = 'https://issuer.example.com';
    process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID = 'my-client';
    process.env.EXPO_PUBLIC_BFF_BASE_URL = 'https://bff.example.com';
    process.env.EXPO_PUBLIC_CAMPAIGNS_ENABLED = 'true';

    const { env } = require('@/core/config/env');
    expect(env.keycloakIssuer).toBe('https://issuer.example.com');
    expect(env.keycloakClientId).toBe('my-client');
    expect(env.bffBaseUrl).toBe('https://bff.example.com');
    expect(env.campaignsEnabled).toBe(true);
  });

  it('treats any value other than the literal string "true" as campaigns disabled', () => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
    process.env.EXPO_PUBLIC_CAMPAIGNS_ENABLED = 'yes';
    const { env } = require('@/core/config/env');
    expect(env.campaignsEnabled).toBe(false);
  });

  it('derives the BFF host from Metro hostUri when running under expo start', () => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { hostUri: '192.168.1.5:8081' } } }));
    delete process.env.EXPO_PUBLIC_BFF_BASE_URL;
    const { env } = require('@/core/config/env');
    expect(env.bffBaseUrl).toBe('http://192.168.1.5:8090');
  });

  it('strips a scheme from hostUri when deriving the dev host', () => {
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { hostUri: 'http://192.168.1.5:8081/extra' } } }));
    delete process.env.EXPO_PUBLIC_BFF_BASE_URL;
    const { env } = require('@/core/config/env');
    expect(env.bffBaseUrl).toBe('http://192.168.1.5:8090');
  });
});
