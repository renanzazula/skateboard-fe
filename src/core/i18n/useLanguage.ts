import { useSyncExternalStore } from 'react';

import { getLanguage, subscribe } from '@/core/i18n/languageStore';

/** Reactive read of the current UI language. */
export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}
