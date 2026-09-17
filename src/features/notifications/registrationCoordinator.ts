/**
 * Keeps device registration down to the calls that actually change something.
 *
 * Deliberately free of react-native and expo imports so it runs under the
 * plain jest-expo transform, the same boundary the campaign modules keep.
 *
 * Two independent problems, two mechanisms:
 *
 * - **Overlap.** Registration is triggered from several places at once (sign-in,
 *   returning to the foreground, a rotated token). Each one reads "have I
 *   registered?" and then awaits a permission check, an Expo token fetch and a
 *   PUT before it can record the answer, so anything starting inside that
 *   window sees a stale "no" and fires its own request. `coalesce` makes the
 *   later callers await the in-flight attempt instead of starting their own.
 *
 * - **Repetition.** Once the backend has accepted a registration, sending the
 *   identical body again changes nothing on either side. `send` remembers the
 *   fingerprint of what was accepted and skips a resend of the same thing,
 *   while still letting a genuinely different payload (a rotated push token, a
 *   new app version) through.
 *
 * Only a *successful* send is remembered, so a declined permission prompt or a
 * registration that failed while the BFF was down is retried on the next
 * trigger rather than latched off.
 */

export type RegistrationOutcome = 'sent' | 'skipped' | 'failed';

/**
 * The parts of a registration that decide whether the backend would learn
 * anything new. `provider` is excluded because it is a constant.
 */
export interface RegistrationIdentity {
  deviceIdentifier: string;
  platform: string;
  pushToken: string;
  appVersion?: string;
  deviceName?: string;
}

export function fingerprintRegistration(identity: RegistrationIdentity): string {
  return JSON.stringify([
    identity.deviceIdentifier,
    identity.platform,
    identity.pushToken,
    identity.appVersion ?? '',
    identity.deviceName ?? '',
  ]);
}

export interface RegistrationCoordinator {
  /**
   * Runs `task`, or joins the one already running. Callers that join get the
   * in-flight result — including its rejection — rather than starting a second
   * attempt.
   */
  coalesce<T>(task: () => Promise<T>): Promise<T>;

  /**
   * Performs `put` unless this exact payload has already been accepted.
   * `put` resolves true when the backend accepted the registration.
   */
  send(fingerprint: string, put: () => Promise<boolean>): Promise<RegistrationOutcome>;

  /** Forgets what was accepted, so the next attempt registers from scratch. */
  reset(): void;
}

export function createRegistrationCoordinator(): RegistrationCoordinator {
  let inFlight: Promise<unknown> | null = null;
  let accepted: string | null = null;

  const clear = () => {
    inFlight = null;
  };

  return {
    coalesce<T>(task: () => Promise<T>): Promise<T> {
      if (inFlight) return inFlight as Promise<T>;
      // Deferred by a microtask so `inFlight` is assigned before `task` can
      // run: a task that throws synchronously would otherwise clear the slot
      // before it was filled, and leave it permanently occupied.
      const run = Promise.resolve().then(task);
      inFlight = run;
      run.then(clear, clear);
      return run;
    },

    async send(fingerprint, put) {
      if (fingerprint === accepted) return 'skipped';
      const ok = await put();
      if (!ok) return 'failed';
      accepted = fingerprint;
      return 'sent';
    },

    reset() {
      accepted = null;
    },
  };
}
