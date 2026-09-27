/**
 * Turns the BFF's per-device counts for a test push into the one message the
 * user needs. Kept free of react-native imports so it runs under the plain
 * jest-expo transform.
 *
 * The counts are the push provider's immediate answer — "accepted", not
 * "shown on the lock screen" — so the success copy says it should arrive,
 * not that it did.
 */

export interface TestNotificationCounts {
  devicesTargeted: number;
  sent: number;
  retryable: number;
  failed: number;
  invalidTokens: number;
}

export type TestNotificationOutcome =
  | { key: 'noDevice' }
  | { key: 'sent'; count: number }
  | { key: 'expired' }
  | { key: 'retrying' }
  | { key: 'rejected' };

export function resolveTestNotificationOutcome(counts: TestNotificationCounts): TestNotificationOutcome {
  if (counts.devicesTargeted === 0) return { key: 'noDevice' };
  // Any acceptance is the answer the user is after: push reaches at least one
  // of their devices. Partial failures on older handsets are not this screen's
  // question.
  if (counts.sent > 0) return { key: 'sent', count: counts.sent };
  if (counts.invalidTokens > 0) return { key: 'expired' };
  if (counts.retryable > 0) return { key: 'retrying' };
  return { key: 'rejected' };
}
