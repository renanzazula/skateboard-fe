import { useEffect, type PropsWithChildren } from 'react';

import { bootstrapLanguage } from '@/core/i18n/languageStore';

/** Loads the persisted UI language once at app start (mirrors AuthProvider). */
export function I18nProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    void bootstrapLanguage();
  }, []);

  return <>{children}</>;
}
