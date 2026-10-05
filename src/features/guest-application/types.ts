import type { components } from '@/core/api/generated/schema';

export type GuestApplication = components['schemas']['GuestApplicationResponse'];
export type GuestApplicationStatus = NonNullable<GuestApplication['status']>;
export type GuestApplicationSettings = components['schemas']['GuestApplicationSettingsResponse'];
export type PublicGuestApplicationSettings = components['schemas']['PublicGuestApplicationSettingsResponse'];

/** Mirrors podcast-be's GuestApplicationStatus.isActive() — DECLINED is the only inactive status. */
export const GUEST_APPLICATION_STATUSES: GuestApplicationStatus[] = ['NEW', 'CONTACTED', 'ACCEPTED', 'DECLINED'];

export function isActiveStatus(status: GuestApplicationStatus): boolean {
  return status !== 'DECLINED';
}
