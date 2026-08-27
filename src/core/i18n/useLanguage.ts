import { useSyncExternalStore } from 'react';

import { getLanguage, isLanguageReady, subscribe } from '@/core/i18n/languageStore';

/** Reactive read of the current UI language. */
export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

/** True once the persisted language has been loaded — see languageStore. */
export function useLanguageReady() {
  return useSyncExternalStore(subscribe, isLanguageReady, isLanguageReady);
}
