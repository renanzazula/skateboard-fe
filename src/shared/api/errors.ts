import type { components } from '@/core/api/generated/schema';

export type BffErrorBody = components['schemas']['ErrorResponse'];

/**
 * Wraps the BFF's `{code, message, correlationId, timestamp}` error shape
 * (skateboard-ui-backend's GlobalExceptionHandler — the same shape for
 * controller errors, @PreAuthorize rejections, and pre-auth failures) so
 * feature code can catch one error type regardless of which layer produced it.
 *
 * This used to read `body.status` and `body.error`, which the contract declared
 * but no response has ever carried, so `code` was always the fallback and a
 * real code was indistinguishable from a generic failure. `status` comes from
 * the HTTP status line — the body does not repeat it.
 *
 * `correlationId` is worth surfacing in any "something went wrong" screen: it
 * is the one value that ties what the user saw to the logs across the BFF and
 * whichever service actually failed.
 */
export class BffError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId?: string;
  readonly timestamp?: string;

  constructor(body: BffErrorBody, fallbackStatus: number) {
    super(body.message ?? genericMessageFor(fallbackStatus));
    this.name = 'BffError';
    this.status = fallbackStatus;
    this.code = body.code ?? 'REQUEST_ERROR';
    this.correlationId = body.correlationId ?? undefined;
    this.timestamp = body.timestamp;
  }
}

export function isBffError(error: unknown): error is BffError {
  return error instanceof BffError;
}

/** openapi-fetch returns `{data, error}`; call this on a truthy `error` to get a BffError. */
export function toBffError(body: BffErrorBody | undefined, fallbackStatus: number): BffError {
  return new BffError(
    body ?? { code: 'REQUEST_ERROR', message: genericMessageFor(fallbackStatus) },
    fallbackStatus
  );
}

export function genericMessageFor(status: number): string {
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return 'Not found.';
  if (status >= 500) return 'The service is currently unavailable. Please try again shortly.';
  return 'Something went wrong.';
}
