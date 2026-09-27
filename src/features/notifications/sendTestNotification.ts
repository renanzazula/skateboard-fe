import { bffClient } from '@/core/api/client';
import { toBffError } from '@/shared/api/errors';
import type { TestNotificationCounts } from '@/features/notifications/testNotificationOutcome';

/**
 * POST /api/me/notifications/test — a test push to the caller's own devices.
 * Throws a BffError on failure, like the other mutation calls.
 */
export async function sendTestNotification(): Promise<TestNotificationCounts> {
  const { data, error, response } = await bffClient.POST('/api/me/notifications/test');
  if (error) throw toBffError(error, response.status);
  return data;
}
