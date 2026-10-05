import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import type { GuestApplicationSettings } from '@/features/guest-application/types';

export interface SaveGuestApplicationSettingsInput {
  enabled: boolean;
  recipientIds: string[];
  confirmationSubject: string;
  confirmationBody: string;
}

/**
 * Admin mutations for the Guest Application feature toggle, recipients, and
 * confirmation email template (Settings → Administration → Guest Application
 * Settings, gated by FUNC_GUEST_APPLICATION_CONFIGURE at the call site).
 * Same submitting/toBffError shape as useTermsAdmin.ts.
 */
export function useGuestApplicationSettingsAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const getSettings = useCallback(async (): Promise<GuestApplicationSettings> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/guest-application-settings/admin');
      if (error || !data) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const saveSettings = useCallback(
    async (input: SaveGuestApplicationSettingsInput): Promise<GuestApplicationSettings> => {
      setSubmitting(true);
      try {
        const { data, error, response } = await bffClient.PUT('/api/guest-application-settings/admin', {
          body: input,
        });
        if (error || !data) throw toBffError(error, response.status);
        return data;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { submitting, getSettings, saveSettings };
}
