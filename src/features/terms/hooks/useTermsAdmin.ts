import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import { toTerms, type Terms, type TermsStatus } from '@/features/terms/types';

export interface SaveTermsInput {
  title: string;
  body: string;
  status: TermsStatus;
}

/**
 * Admin mutations for the Terms & Conditions page (Settings → Administration →
 * Terms & Conditions, gated by FUNC_TERMS_MANAGE at the call site). Same
 * submitting/toBffError shape as features/privacy-policy/hooks/usePrivacyPolicyAdmin.ts.
 */
export function useTermsAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const getTerms = useCallback(async (): Promise<Terms | null> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/terms/admin');
      if (response.status === 204) return null;
      if (error || !data) throw toBffError(error, response.status);
      return toTerms(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const saveTerms = useCallback(async (input: SaveTermsInput): Promise<Terms> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/terms', {
        body: {
          title: input.title,
          body: input.body,
          status: input.status,
        },
      });
      if (error || !data) throw toBffError(error, response.status);
      return toTerms(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, getTerms, saveTerms };
}
