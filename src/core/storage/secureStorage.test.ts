import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { secureStorage } from '@/core/storage/secureStorage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('secureStorage', () => {
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  describe('on native', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    it('getItem delegates to SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-value');
      await expect(secureStorage.getItem('key')).resolves.toBe('stored-value');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('key');
    });

    it('setItem delegates to SecureStore', async () => {
      await secureStorage.setItem('key', 'value');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key', 'value');
    });

    it('deleteItem delegates to SecureStore', async () => {
      await secureStorage.deleteItem('key');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key');
    });
  });

  describe('on web', () => {
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      jest.clearAllMocks();
      // @ts-expect-error test shim
      globalThis.localStorage = localStorageMock;
    });

    afterEach(() => {
      // @ts-expect-error test shim
      delete globalThis.localStorage;
    });

    it('getItem falls back to localStorage', async () => {
      localStorageMock.getItem.mockReturnValueOnce('web-value');
      await expect(secureStorage.getItem('key')).resolves.toBe('web-value');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('key');
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('getItem returns null when localStorage is unavailable', async () => {
      // @ts-expect-error test shim
      delete globalThis.localStorage;
      await expect(secureStorage.getItem('key')).resolves.toBeNull();
    });

    it('setItem writes to localStorage', async () => {
      await secureStorage.setItem('key', 'value');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('key', 'value');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('deleteItem removes from localStorage', async () => {
      await secureStorage.deleteItem('key');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('key');
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });
  });
});
