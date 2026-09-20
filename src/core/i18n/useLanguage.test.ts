import { renderHook, act } from '@testing-library/react-native';

import { useLanguage, useLanguageReady } from '@/core/i18n/useLanguage';
import * as languageStore from '@/core/i18n/languageStore';

jest.mock('@/core/i18n/languageStore', () => ({
  subscribe: jest.fn(),
  getLanguage: jest.fn(),
  isLanguageReady: jest.fn(),
}));

const mockSubscribe = languageStore.subscribe as jest.Mock;
const mockGetLanguage = languageStore.getLanguage as jest.Mock;
const mockIsLanguageReady = languageStore.isLanguageReady as jest.Mock;

describe('useLanguage / useLanguageReady', () => {
  let listeners: Array<() => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners = [];
    mockSubscribe.mockImplementation((listener: () => void) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    });
    mockGetLanguage.mockReturnValue('en');
    mockIsLanguageReady.mockReturnValue(false);
  });

  it('useLanguage returns the current language and re-renders on change', async () => {
    const { result, rerender } = await renderHook(() => useLanguage());
    expect(result.current).toBe('en');

    mockGetLanguage.mockReturnValue('pt');
    await act(async () => {
      listeners.forEach((listener) => listener());
    });
    rerender({});

    expect(result.current).toBe('pt');
  });

  it('useLanguageReady returns the ready flag and re-renders on change', async () => {
    const { result, rerender } = await renderHook(() => useLanguageReady());
    expect(result.current).toBe(false);

    mockIsLanguageReady.mockReturnValue(true);
    await act(async () => {
      listeners.forEach((listener) => listener());
    });
    rerender({});

    expect(result.current).toBe(true);
  });
});
