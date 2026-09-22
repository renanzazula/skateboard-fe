import { withTimeout } from '@/shared/utils/withTimeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the inner promise value when it settles before the timeout', async () => {
    const promise = withTimeout(Promise.resolve('value'), 1000, 'op');
    await expect(promise).resolves.toBe('value');
  });

  it('rejects with the inner promise error when it rejects before the timeout', async () => {
    const promise = withTimeout(Promise.reject(new Error('boom')), 1000, 'op');
    await expect(promise).rejects.toThrow('boom');
  });

  it('rejects with a labeled timeout error when the timeout elapses first', async () => {
    const inner = new Promise(() => {});
    const promise = withTimeout(inner, 1000, 'my-op');
    jest.advanceTimersByTime(1000);
    await expect(promise).rejects.toThrow('my-op timed out after 1000ms');
  });
});
