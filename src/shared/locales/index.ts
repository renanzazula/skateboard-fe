import { en, type TranslationKeys } from './en';
import { es } from './es';
import { pt } from './pt';

export type Language = 'en' | 'es' | 'pt';

export const LANGUAGES: readonly Language[] = ['en', 'es', 'pt'];

export const DEFAULT_LANGUAGE: Language = 'en';

// Native endonyms — a language list reads best in its own language, and that's
// how iOS/Android and most apps present it, so these are not themselves
// translated.
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

export function isLanguage(value: string | null | undefined): value is Language {
  return value === 'en' || value === 'es' || value === 'pt';
}

export const translations: Record<Language, TranslationKeys> = { en, es, pt };

export type { TranslationKeys };
