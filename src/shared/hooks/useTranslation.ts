import { useCallback } from 'react';

import { translations, type TranslationKeys } from '@/shared/locales';

// Ported from rork-standard-app/expo's shared/hooks/useTranslation.ts.
// Language is fixed to 'en' here — no PreferencesContext/language-switcher
// exists in this app yet; add a `language` state source once one does.
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<TranslationKeys>;

export function useTranslation() {
  const language = 'en' as const;

  // Stable identity so `t` is safe to use in dependency arrays.
  const t = useCallback((key: TranslationKey): string => {
    const keys = key.split('.');
    let value: unknown = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }, []);

  return { t, language };
}
