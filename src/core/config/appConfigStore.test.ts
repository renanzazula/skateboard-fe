jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

// jest.resetModules() below re-runs the mock factory above for every test,
// producing new jest.fn() instances — so the mock must be re-required after
// resetModules() rather than captured once at module scope.
function setup() {
  jest.resetModules();
  const { bffClient } = require('@/core/api/client');
  const appConfigStore = require('@/core/config/appConfigStore') as typeof import('@/core/config/appConfigStore');
  return { appConfigStore, bffClient };
}

describe('appConfigStore', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('defaults to a loading state with no config values', () => {
    const { appConfigStore } = setup();

    expect(appConfigStore.getState()).toEqual({
      status: 'loading',
      loginBackgroundUrl: null,
      loginBackgroundVersion: 0,
      appLogoUrl: null,
      appLogoVersion: 0,
      loginTitle: null,
      loginMessage: null,
    });
  });

  it('bootstrap applies the fetched config on success, defaulting missing fields', async () => {
    const { appConfigStore, bffClient } = setup();
    bffClient.GET.mockResolvedValue({
      data: { loginBackgroundUrl: 'https://x/bg.png', loginTitle: 'Skateboard Radio' },
      error: undefined,
    });

    await appConfigStore.bootstrap();

    expect(appConfigStore.getState()).toEqual({
      status: 'ready',
      loginBackgroundUrl: 'https://x/bg.png',
      loginBackgroundVersion: 0,
      appLogoUrl: null,
      appLogoVersion: 0,
      loginTitle: 'Skateboard Radio',
      loginMessage: null,
    });
    expect(bffClient.GET).toHaveBeenCalledWith('/api/config');
  });

  it('bootstrap sets an error status when the BFF returns an error', async () => {
    const { appConfigStore, bffClient } = setup();
    bffClient.GET.mockResolvedValue({ data: undefined, error: { message: 'boom' } });

    await appConfigStore.bootstrap();

    expect(appConfigStore.getState().status).toBe('error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('bootstrap sets an error status when the BFF returns no data and no error', async () => {
    const { appConfigStore, bffClient } = setup();
    bffClient.GET.mockResolvedValue({ data: undefined, error: undefined });

    await appConfigStore.bootstrap();

    expect(appConfigStore.getState().status).toBe('error');
  });

  it('bootstrap sets an error status when the request throws', async () => {
    const { appConfigStore, bffClient } = setup();
    bffClient.GET.mockRejectedValue(new Error('network down'));

    await appConfigStore.bootstrap();

    expect(appConfigStore.getState().status).toBe('error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('subscribe notifies listeners on state changes and can unsubscribe', async () => {
    const { appConfigStore, bffClient } = setup();
    bffClient.GET.mockResolvedValue({ data: {}, error: undefined });
    const listener = jest.fn();
    const unsubscribe = appConfigStore.subscribe(listener);

    await appConfigStore.bootstrap();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    listener.mockClear();
    await appConfigStore.bootstrap();
    expect(listener).not.toHaveBeenCalled();
  });
});
