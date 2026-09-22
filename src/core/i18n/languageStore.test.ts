jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    deleteItem: jest.fn(),
  },
}));

// jest.resetModules() below re-runs the mock factory above for every test,
// producing new jest.fn() instances — so the mock must be re-required after
// resetModules() rather than captured once at module scope.
function setup() {
  jest.resetModules();
  const { secureStorage } = require('@/core/storage/secureStorage');
  secureStorage.getItem.mockResolvedValue(null);
  secureStorage.setItem.mockResolvedValue(undefined);

  const languageStore = require('@/core/i18n/languageStore') as typeof import('@/core/i18n/languageStore');
  return { languageStore, secureStorage };
}

describe('languageStore', () => {
  it('defaults to English before bootstrap and reports not ready', () => {
    const { languageStore } = setup();
    expect(languageStore.getLanguage()).toBe('en');
    expect(languageStore.isLanguageReady()).toBe(false);
  });

  it('bootstrapLanguage loads a persisted valid language and flips ready', async () => {
    const { languageStore, secureStorage } = setup();
    secureStorage.getItem.mockResolvedValueOnce('es');

    await languageStore.bootstrapLanguage();

    expect(languageStore.getLanguage()).toBe('es');
    expect(languageStore.isLanguageReady()).toBe(true);
  });

  it('bootstrapLanguage ignores an invalid stored value and keeps the default', async () => {
    const { languageStore, secureStorage } = setup();
    secureStorage.getItem.mockResolvedValueOnce('klingon');

    await languageStore.bootstrapLanguage();

    expect(languageStore.getLanguage()).toBe('en');
  });

  it('bootstrapLanguage tolerates a storage read failure and still becomes ready', async () => {
    const { languageStore, secureStorage } = setup();
    secureStorage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));

    await languageStore.bootstrapLanguage();

    expect(languageStore.getLanguage()).toBe('en');
    expect(languageStore.isLanguageReady()).toBe(true);
  });

  it('bootstrapLanguage only runs once even if called again', async () => {
    const { languageStore, secureStorage } = setup();
    secureStorage.getItem.mockResolvedValueOnce('pt');

    await languageStore.bootstrapLanguage();
    await languageStore.bootstrapLanguage();

    expect(secureStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('setLanguage updates state, notifies subscribers, and persists', () => {
    const { languageStore, secureStorage } = setup();
    const listener = jest.fn();
    const unsubscribe = languageStore.subscribe(listener);

    languageStore.setLanguage('pt');

    expect(languageStore.getLanguage()).toBe('pt');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(secureStorage.setItem).toHaveBeenCalledWith('skateboard.settings.language', 'pt');

    unsubscribe();
  });

  it('setLanguage is a no-op when setting the already-current language', () => {
    const { languageStore, secureStorage } = setup();
    const listener = jest.fn();
    languageStore.subscribe(listener);

    languageStore.setLanguage('en');

    expect(listener).not.toHaveBeenCalled();
    expect(secureStorage.setItem).not.toHaveBeenCalled();
  });

  it('unsubscribe stops further notifications', () => {
    const { languageStore } = setup();
    const listener = jest.fn();
    const unsubscribe = languageStore.subscribe(listener);
    unsubscribe();

    languageStore.setLanguage('es');

    expect(listener).not.toHaveBeenCalled();
  });

  it('setLanguage tolerates a persistence failure', () => {
    const { languageStore, secureStorage } = setup();
    secureStorage.setItem.mockRejectedValueOnce(new Error('write failed'));

    expect(() => languageStore.setLanguage('es')).not.toThrow();
    expect(languageStore.getLanguage()).toBe('es');
  });
});
