import { registerHomeReload, triggerHomeReload } from '@/features/home/homeReloadRegistry';

describe('homeReloadRegistry', () => {
  it('calls the registered handler when triggered', () => {
    const handler = jest.fn();
    registerHomeReload(handler);

    triggerHomeReload();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no handler is registered', () => {
    expect(() => triggerHomeReload()).not.toThrow();
  });

  it('unregister removes the handler', () => {
    const handler = jest.fn();
    const unregister = registerHomeReload(handler);
    unregister();

    triggerHomeReload();

    expect(handler).not.toHaveBeenCalled();
  });

  it('registering a new handler replaces the previous one', () => {
    const first = jest.fn();
    const second = jest.fn();
    registerHomeReload(first);
    registerHomeReload(second);

    triggerHomeReload();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("unregistering a stale handler doesn't clear a newer one", () => {
    const first = jest.fn();
    const second = jest.fn();
    const unregisterFirst = registerHomeReload(first);
    registerHomeReload(second);

    unregisterFirst();
    triggerHomeReload();

    expect(second).toHaveBeenCalledTimes(1);
  });
});
