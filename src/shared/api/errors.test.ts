import { BffError, genericMessageFor, isBffError, toBffError } from '@/shared/api/errors';

describe('BffError', () => {
  it('uses the body message when present', () => {
    const err = new BffError({ code: 'CUSTOM_CODE', message: 'Custom message' }, 400);

    expect(err.message).toBe('Custom message');
    expect(err.name).toBe('BffError');
    expect(err.status).toBe(400);
    expect(err.code).toBe('CUSTOM_CODE');
  });

  it('falls back to a generic message and code when the body omits them', () => {
    const err = new BffError({}, 404);

    expect(err.message).toBe('Not found.');
    expect(err.code).toBe('REQUEST_ERROR');
    expect(err.correlationId).toBeUndefined();
    expect(err.timestamp).toBeUndefined();
  });

  it('carries correlationId and timestamp through when present', () => {
    const err = new BffError(
      { message: 'Boom', correlationId: 'abc-123', timestamp: '2024-01-01T00:00:00Z' },
      500
    );

    expect(err.correlationId).toBe('abc-123');
    expect(err.timestamp).toBe('2024-01-01T00:00:00Z');
  });
});

describe('isBffError', () => {
  it('returns true for a BffError instance', () => {
    expect(isBffError(new BffError({}, 500))).toBe(true);
  });

  it('returns false for a plain Error or non-error value', () => {
    expect(isBffError(new Error('plain'))).toBe(false);
    expect(isBffError('nope')).toBe(false);
    expect(isBffError(null)).toBe(false);
  });
});

describe('toBffError', () => {
  it('builds a BffError from a response body', () => {
    const err = toBffError({ code: 'X', message: 'from body' }, 400);

    expect(err).toBeInstanceOf(BffError);
    expect(err.message).toBe('from body');
    expect(err.code).toBe('X');
  });

  it('builds a generic BffError when the body is undefined', () => {
    const err = toBffError(undefined, 403);

    expect(err.code).toBe('REQUEST_ERROR');
    expect(err.message).toBe("You don't have permission to do that.");
  });
});

describe('genericMessageFor', () => {
  it.each([
    [401, 'Your session has expired. Please log in again.'],
    [403, "You don't have permission to do that."],
    [404, 'Not found.'],
    [500, 'The service is currently unavailable. Please try again shortly.'],
    [503, 'The service is currently unavailable. Please try again shortly.'],
    [418, 'Something went wrong.'],
  ])('maps status %i to %s', (status, message) => {
    expect(genericMessageFor(status)).toBe(message);
  });
});
