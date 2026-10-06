import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import type { GuestApplication } from '@/features/guest-application/types';

export interface SubmitGuestApplicationInput {
  name: string;
  email: string;
  message: string;
  socialLinks: string[];
}

/**
 * POST /api/guest-applications — the "Be a Podcast Guest" form's submit
 * action (Settings → Community). A 409 (already has an active application)
 * surfaces as a BffError like any other failure; the screen doesn't special-
 * case it because {@link useMyGuestApplication} already prevents the form
 * from showing once an active application exists.
 */
export function useSubmitGuestApplication() {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (input: SubmitGuestApplicationInput): Promise<GuestApplication> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.POST('/api/guest-applications', {
        body: {
          name: input.name,
          email: input.email,
          message: input.message,
          socialLinks: input.socialLinks,
        },
      });
      if (error || !data) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, submit };
}
