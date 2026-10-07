import type { components } from '@/core/api/generated/schema';

export type EmailTemplate = components['schemas']['EmailTemplateResponse'];
export type EmailTemplateType = components['schemas']['EmailTemplateType'];

/** Matches the order skateboard-app-config-be materializes rows in (EmailTemplateType.values() loop). */
export const EMAIL_TEMPLATE_TYPES: EmailTemplateType[] = [
  'GUEST_APPLICATION_RECEIVED',
  'GUEST_APPLICATION_ADMIN_NOTIFICATION',
];
