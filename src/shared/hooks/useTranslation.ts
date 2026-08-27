import { useCallback } from 'react';

import { useLanguage } from '@/core/i18n/useLanguage';
import { translations, type TranslationKeys } from '@/shared/locales';

// Ported from rork-standard-app/expo's shared/hooks/useTranslation.ts, then
// wired to core/i18n's language store so the Settings language picker actually
// takes effect.
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<TranslationKeys>;

/** Values for `{token}` placeholders in a string (e.g. `podcast.recordedOn`). */
type TranslationParams = Record<string, string | number>;

export function useTranslation() {
  const language = useLanguage();

  // Depends on `language` so screens re-render `t(...)` output when the user
  // switches language without leaving the screen.
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
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

      if (typeof value !== 'string') {
        return key;
      }
      if (!params) {
        return value;
      }
      return value.replace(/\{(\w+)\}/g, (whole, name: string) =>
        name in params ? String(params[name]) : whole
      );
    },
    [language]
  );

  return { t, language };
}
