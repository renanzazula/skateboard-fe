import { useEffect, type PropsWithChildren } from 'react';

import { bootstrap } from '@/core/config/appConfigStore';

/** Kicks off the public app-config fetch (login background, app logo) once at app start. */
export function AppConfigProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    bootstrap();
  }, []);

  return <>{children}</>;
}
