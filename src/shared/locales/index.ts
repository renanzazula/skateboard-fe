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

// Regional-indicator pairs, which every iOS and Android version renders as a
// flag. Portuguese flies the Brazilian flag rather than Portugal's: the show
// is Brazilian and its episodes are in pt-BR.
//
// Windows renders these as letter pairs ("GB") instead of flags, so the label
// beside them is what carries the meaning — never show a flag on its own.
export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  pt: '🇧🇷',
};

export function isLanguage(value: string | null | undefined): value is Language {
  return value === 'en' || value === 'es' || value === 'pt';
}

export const translations: Record<Language, TranslationKeys> = { en, es, pt };

export type { TranslationKeys };
