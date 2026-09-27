import { resolveTestNotificationOutcome } from '@/features/notifications/testNotificationOutcome';

const counts = (overrides: Partial<Parameters<typeof resolveTestNotificationOutcome>[0]>) => ({
  devicesTargeted: 1,
  sent: 0,
  retryable: 0,
  failed: 0,
  invalidTokens: 0,
  ...overrides,
});

describe('resolveTestNotificationOutcome', () => {
  it('reports no device when nothing is registered', () => {
    expect(resolveTestNotificationOutcome(counts({ devicesTargeted: 0 }))).toEqual({ key: 'noDevice' });
  });

  it('reports success when any device accepted it, even if another failed', () => {
    expect(resolveTestNotificationOutcome(counts({ devicesTargeted: 2, sent: 1, invalidTokens: 1 }))).toEqual({
      key: 'sent',
      count: 1,
    });
  });

  it('reports an expired registration when the only token was dead', () => {
    expect(resolveTestNotificationOutcome(counts({ invalidTokens: 1 }))).toEqual({ key: 'expired' });
  });

  it('reports a retry when the provider could not be reached', () => {
    expect(resolveTestNotificationOutcome(counts({ retryable: 1 }))).toEqual({ key: 'retrying' });
  });

  it('reports a rejection otherwise', () => {
    expect(resolveTestNotificationOutcome(counts({ failed: 1 }))).toEqual({ key: 'rejected' });
  });
});
