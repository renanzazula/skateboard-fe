import { secureStorage } from '@/core/storage/secureStorage';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from '@/shared/locales';

/**
 * Module-level UI-language store, same shape as core/auth/authStore.ts: state
 * lives outside React so non-component code (useTranslation's `t`) can read it
 * synchronously, and components subscribe via useSyncExternalStore.
 *
 * The key is the one useLocalSettings has always written, so a language
 * chosen before this store existed is picked up with no migration.
 */
const LANGUAGE_STORAGE_KEY = 'skateboard.settings.language';

let current: Language = DEFAULT_LANGUAGE;
let ready = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getLanguage(): Language {
  return current;
}

/**
 * False until bootstrapLanguage() has read storage. The root layout holds the
 * splash screen until this flips, so the first painted frame is already in the
 * user's language — no English flash.
 */
export function isLanguageReady(): boolean {
  return ready;
}

/** For React's useSyncExternalStore — see core/i18n/useLanguage.ts. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setCurrent(next: Language): void {
  if (next === current) {
    return;
  }
  current = next;
  emit();
}

/** User picked a language in Settings — updates every subscriber and persists. */
export function setLanguage(next: Language): void {
  if (next === current) {
    return;
  }
  setCurrent(next);
  secureStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
}

let bootstrapPromise: Promise<void> | null = null;

/** Loads the persisted language once at app start (see core/i18n/I18nProvider). */
export function bootstrapLanguage(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = secureStorage
      .getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (isLanguage(stored)) {
          current = stored;
        }
      })
      .catch(() => {
        // A failed read just leaves DEFAULT_LANGUAGE in place — not fatal.
      })
      .finally(() => {
        ready = true;
        emit();
      });
  }
  return bootstrapPromise;
}
