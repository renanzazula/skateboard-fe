import {
  createRegistrationCoordinator,
  fingerprintRegistration,
  type RegistrationIdentity,
} from '@/features/notifications/registrationCoordinator';

const identity: RegistrationIdentity = {
  deviceIdentifier: '6e56dd38-97cd-45c1-97a3-574104d7304d',
  platform: 'IOS',
  pushToken: 'ExponentPushToken[abc]',
  appVersion: '1.4.0',
  deviceName: "Renan's iPhone",
};

/** A promise plus the handles to settle it, so a task can be held mid-flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('fingerprintRegistration', () => {
  it('is stable for the same registration', () => {
    expect(fingerprintRegistration(identity)).toEqual(fingerprintRegistration({ ...identity }));
  });

  it('changes when the push token rotates', () => {
    expect(fingerprintRegistration({ ...identity, pushToken: 'ExponentPushToken[xyz]' })).not.toEqual(
      fingerprintRegistration(identity)
    );
  });

  it('changes when the device identifier changes', () => {
    expect(fingerprintRegistration({ ...identity, deviceIdentifier: 'other' })).not.toEqual(
      fingerprintRegistration(identity)
    );
  });

  it('changes when the app is updated', () => {
    expect(fingerprintRegistration({ ...identity, appVersion: '1.5.0' })).not.toEqual(
      fingerprintRegistration(identity)
    );
  });

  it('changes when the device is renamed', () => {
    expect(fingerprintRegistration({ ...identity, deviceName: 'iPad' })).not.toEqual(
      fingerprintRegistration(identity)
    );
  });

  it('treats an absent optional field as empty rather than throwing', () => {
    const bare = { deviceIdentifier: 'd', platform: 'IOS', pushToken: 't' };
    expect(fingerprintRegistration(bare)).toEqual(
      fingerprintRegistration({ ...bare, appVersion: undefined, deviceName: undefined })
    );
  });
});

describe('coalesce', () => {
  it('runs a single task and returns its result', async () => {
    const coordinator = createRegistrationCoordinator();
    await expect(coordinator.coalesce(async () => 'token')).resolves.toBe('token');
  });

  it('joins overlapping callers onto the in-flight attempt', async () => {
    const coordinator = createRegistrationCoordinator();
    const gate = deferred<string>();
    const task = jest.fn(() => gate.promise);

    // The real trigger set: mount, foreground, token rotation — all landing
    // before the first attempt has finished awaiting the network.
    const callers = [coordinator.coalesce(task), coordinator.coalesce(task), coordinator.coalesce(task)];
    gate.resolve('token');

    await expect(Promise.all(callers)).resolves.toEqual(['token', 'token', 'token']);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh attempt once the previous one has settled', async () => {
    const coordinator = createRegistrationCoordinator();
    const task = jest.fn(async () => 'token');

    await coordinator.coalesce(task);
    await coordinator.coalesce(task);

    expect(task).toHaveBeenCalledTimes(2);
  });

  it('gives joiners the in-flight rejection', async () => {
    const coordinator = createRegistrationCoordinator();
    const gate = deferred<string>();
    const first = coordinator.coalesce(() => gate.promise);
    const joiner = coordinator.coalesce(async () => 'not reached');
    gate.reject(new Error('offline'));

    await expect(first).rejects.toThrow('offline');
    await expect(joiner).rejects.toThrow('offline');
  });

  it('is usable again after a rejected attempt', async () => {
    const coordinator = createRegistrationCoordinator();
    await expect(
      coordinator.coalesce(async () => {
        throw new Error('offline');
      })
    ).rejects.toThrow('offline');

    await expect(coordinator.coalesce(async () => 'token')).resolves.toBe('token');
  });

  it('is usable again after a task that throws synchronously', async () => {
    const coordinator = createRegistrationCoordinator();
    await expect(
      coordinator.coalesce((() => {
        throw new Error('boom');
      }) as () => Promise<string>)
    ).rejects.toThrow('boom');

    // A synchronous throw must not leave the slot permanently occupied.
    await expect(coordinator.coalesce(async () => 'token')).resolves.toBe('token');
  });
});

describe('send', () => {
  it('performs the first registration', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest.fn(async () => true);

    await expect(coordinator.send('fp', put)).resolves.toBe('sent');
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('skips a resend of an already-accepted registration', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest.fn(async () => true);

    await coordinator.send('fp', put);
    await expect(coordinator.send('fp', put)).resolves.toBe('skipped');
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('sends again when the push token rotates', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest.fn(async () => true);

    await coordinator.send(fingerprintRegistration(identity), put);
    await expect(
      coordinator.send(fingerprintRegistration({ ...identity, pushToken: 'rotated' }), put)
    ).resolves.toBe('sent');
    expect(put).toHaveBeenCalledTimes(2);
  });

  it('does not remember a rejected registration, so it is retried', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest
      .fn<Promise<boolean>, []>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(coordinator.send('fp', put)).resolves.toBe('failed');
    await expect(coordinator.send('fp', put)).resolves.toBe('sent');
    expect(put).toHaveBeenCalledTimes(2);
  });

  it('registers again after a reset, even with an unchanged payload', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest.fn(async () => true);

    await coordinator.send('fp', put);
    coordinator.reset();

    // Sign-out then sign-in on the same handset: same push token, new account.
    await expect(coordinator.send('fp', put)).resolves.toBe('sent');
    expect(put).toHaveBeenCalledTimes(2);
  });
});

describe('the reported burst', () => {
  /** Stands in for registerPushDevice: coalesced body, de-duplicated PUT. */
  function registrar(coordinator: ReturnType<typeof createRegistrationCoordinator>, put: () => Promise<boolean>) {
    return (token = identity.pushToken) =>
      coordinator.coalesce(async () => {
        // Two awaits before the PUT, standing in for the permission check and
        // the Expo token fetch — the window the old latch left open.
        await Promise.resolve();
        await Promise.resolve();
        return coordinator.send(fingerprintRegistration({ ...identity, pushToken: token }), put);
      });
  }

  it('collapses a storm of lifecycle triggers into one PUT', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest.fn(async () => true);
    const register = registrar(coordinator, put);

    // Dozens of triggers within seconds, as reported in production.
    await Promise.all(Array.from({ length: 50 }, () => register()));

    expect(put).toHaveBeenCalledTimes(1);
  });

  it('sends nothing further on repeated triggers after a successful registration', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest.fn(async () => true);
    const register = registrar(coordinator, put);

    await register();
    // Every later foreground event, re-render and token-listener callback.
    for (let i = 0; i < 20; i += 1) {
      await expect(register()).resolves.toBe('skipped');
    }

    expect(put).toHaveBeenCalledTimes(1);
  });

  it('still delivers a rotated token after the burst', async () => {
    const coordinator = createRegistrationCoordinator();
    const put = jest.fn(async () => true);
    const register = registrar(coordinator, put);

    await Promise.all(Array.from({ length: 10 }, () => register()));
    await expect(register('ExponentPushToken[rotated]')).resolves.toBe('sent');

    expect(put).toHaveBeenCalledTimes(2);
  });
});
