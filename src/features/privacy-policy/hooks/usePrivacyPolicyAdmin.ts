import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import { toPrivacyPolicy, type PrivacyPolicy, type PrivacyPolicyStatus } from '@/features/privacy-policy/types';

export interface SavePrivacyPolicyInput {
  title: string;
  body: string;
  status: PrivacyPolicyStatus;
}

/**
 * Admin mutations for the Privacy Policy page (Settings → Administration →
 * Privacy Policy, gated by FUNC_PRIVACY_POLICY_MANAGE at the call site). Same
 * submitting/toBffError shape as features/about/hooks/useAboutAdmin.ts, minus
 * the image upload — this page is plain title+body text.
 */
export function usePrivacyPolicyAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const getPrivacyPolicy = useCallback(async (): Promise<PrivacyPolicy | null> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/privacy-policy/admin');
      if (response.status === 204) return null;
      if (error || !data) throw toBffError(error, response.status);
      return toPrivacyPolicy(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const savePrivacyPolicy = useCallback(async (input: SavePrivacyPolicyInput): Promise<PrivacyPolicy> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/privacy-policy', {
        body: {
          title: input.title,
          body: input.body,
          status: input.status,
        },
      });
      if (error || !data) throw toBffError(error, response.status);
      return toPrivacyPolicy(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, getPrivacyPolicy, savePrivacyPolicy };
}
