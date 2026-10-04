import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import { toLicenses, type Licenses, type LicensesStatus } from '@/features/licenses/types';

export interface SaveLicensesInput {
  title: string;
  body: string;
  status: LicensesStatus;
}

/**
 * Admin mutations for the Open-source Licenses page (Settings → Administration →
 * Open-source Licenses, gated by FUNC_LICENSES_MANAGE at the call site). Same
 * submitting/toBffError shape as features/privacy-policy/hooks/usePrivacyPolicyAdmin.ts.
 */
export function useLicensesAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const getLicenses = useCallback(async (): Promise<Licenses | null> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/licenses/admin');
      if (response.status === 204) return null;
      if (error || !data) throw toBffError(error, response.status);
      return toLicenses(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const saveLicenses = useCallback(async (input: SaveLicensesInput): Promise<Licenses> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/licenses', {
        body: {
          title: input.title,
          body: input.body,
          status: input.status,
        },
      });
      if (error || !data) throw toBffError(error, response.status);
      return toLicenses(data);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, getLicenses, saveLicenses };
}
