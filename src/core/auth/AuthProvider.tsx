import { useEffect, type PropsWithChildren } from 'react';

import { bootstrap } from '@/core/auth/authStore';

/** Kicks off silent sign-in (stored refresh token, if any) once at app start. */
export function AuthProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    bootstrap();
  }, []);

  return <>{children}</>;
}
