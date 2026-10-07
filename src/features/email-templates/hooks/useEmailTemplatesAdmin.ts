import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { EmailTemplate } from '@/features/email-templates/types';
import { toBffError } from '@/shared/api/errors';

export interface UpdateEmailTemplateInput {
  subject: string;
  body: string;
  enabled: boolean;
}

/**
 * Admin mutations for email templates (Settings → Administration → Email
 * Templates, gated by FUNC_EMAIL_TEMPLATE_MANAGE at the call site). Same
 * submitting/toBffError shape as useGuestApplicationSettingsAdmin.ts. There
 * is no per-type/language GET used here — the list endpoint already
 * materializes every (type, language) row with its id, which is all an edit
 * needs.
 */
export function useEmailTemplatesAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const listTemplates = useCallback(async (): Promise<EmailTemplate[]> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.GET('/api/email-templates');
      if (error || !data) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, input: UpdateEmailTemplateInput): Promise<EmailTemplate> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/email-templates/{id}', {
        params: { path: { id } },
        body: input,
      });
      if (error || !data) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, listTemplates, updateTemplate };
}
