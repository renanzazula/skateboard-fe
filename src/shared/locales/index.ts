import { en, type TranslationKeys } from './en';

// Only 'en' is wired up for now (no language-switcher UI yet) — add more
// locale files and extend this union when a picker is actually built.
export type Language = 'en';

export const translations: Record<Language, TranslationKeys> = {
  en,
};

export type { TranslationKeys };
