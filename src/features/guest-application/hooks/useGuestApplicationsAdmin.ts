import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import type { GuestApplication, GuestApplicationStatus } from '@/features/guest-application/types';

/** Comfortably above any realistic review backlog, so V1 skips pagination controls entirely. */
const LIST_PAGE_SIZE = 100;

/**
 * Admin mutations/reads for Guest Applications (Settings → Administration →
 * Guest Applications, gated by FUNC_GUEST_APPLICATION_MANAGE at the call
 * site). Same submitting/toBffError shape as useTermsAdmin.ts.
 */
export function useGuestApplicationsAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setSubmitting(true);
    try {
      return await fn();
    } finally {
      setSubmitting(false);
    }
  }, []);

  const listApplications = useCallback(
    (status?: GuestApplicationStatus) =>
      run(async () => {
        const { data, error, response } = await bffClient.GET('/api/admin/guest-applications', {
          params: { query: { status, page: 0, size: LIST_PAGE_SIZE } },
        });
        if (error || !data) throw toBffError(error, response.status);
        return data.applications ?? [];
      }),
    [run]
  );

  const getApplication = useCallback(
    (id: string) =>
      run(async () => {
        const { data, error, response } = await bffClient.GET('/api/admin/guest-applications/{id}', {
          params: { path: { id } },
        });
        if (error || !data) throw toBffError(error, response.status);
        return data;
      }),
    [run]
  );

  const updateStatus = useCallback(
    (id: string, status: GuestApplicationStatus): Promise<GuestApplication> =>
      run(async () => {
        const { data, error, response } = await bffClient.PATCH('/api/admin/guest-applications/{id}/status', {
          params: { path: { id } },
          body: { status },
        });
        if (error || !data) throw toBffError(error, response.status);
        return data;
      }),
    [run]
  );

  return { submitting, listApplications, getApplication, updateStatus };
}
