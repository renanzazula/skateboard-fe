import { renderHook } from '@testing-library/react-native';

import { useTranslation } from '@/shared/hooks/useTranslation';
import { useLanguage } from '@/core/i18n/useLanguage';

jest.mock('@/core/i18n/useLanguage', () => ({
  useLanguage: jest.fn(),
}));

const mockUseLanguage = useLanguage as jest.Mock;

describe('useTranslation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLanguage.mockReturnValue('en');
  });

  it('resolves a plain key with no params', async () => {
    const { result } = await renderHook(() => useTranslation());

    expect(result.current.t('common.save')).toBe('Save');
    expect(result.current.language).toBe('en');
  });

  it('substitutes {token} placeholders from params', async () => {
    const { result } = await renderHook(() => useTranslation());

    expect(result.current.t('settings.usernameMinLength', { min: 5 })).toBe(
      'Usernames must be at least 5 characters.'
    );
  });

  it('leaves an unrecognized {token} placeholder untouched', async () => {
    const { result } = await renderHook(() => useTranslation());

    expect(result.current.t('settings.usernameMinLength', { other: 5 })).toBe(
      'Usernames must be at least {min} characters.'
    );
  });

  it('warns and returns the key itself when the key path does not resolve', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderHook(() => useTranslation());

    // @ts-expect-error deliberately invalid key to exercise the not-found branch
    const output = result.current.t('settings.doesNotExist');

    expect(output).toBe('settings.doesNotExist');
    expect(warnSpy).toHaveBeenCalledWith('Translation key not found: settings.doesNotExist');
    warnSpy.mockRestore();
  });

  it('returns the key when the resolved value is not a string (e.g. an object)', async () => {
    const { result } = await renderHook(() => useTranslation());

    // @ts-expect-error "settings" resolves to an object, not a string
    const output = result.current.t('settings');

    expect(output).toBe('settings');
  });

  it('reads from the language selected by useLanguage', async () => {
    mockUseLanguage.mockReturnValue('pt');
    const { result } = await renderHook(() => useTranslation());

    expect(result.current.language).toBe('pt');
    expect(result.current.t('common.save')).not.toBe('');
  });
});
