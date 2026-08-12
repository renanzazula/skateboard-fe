import type { components } from '@/core/api/generated/schema';

export type BffErrorBody = components['schemas']['ErrorResponse'];

/**
 * Wraps the BFF's `{status, error, message, timestamp}` error shape
 * (skateboard-ui-backend's GlobalExceptionHandler — the same shape for
 * controller errors, @PreAuthorize rejections, and pre-auth failures) so
 * feature code can catch one error type regardless of which layer produced it.
 */
export class BffError extends Error {
  readonly status: number;
  readonly code: string;
  readonly timestamp?: string;

  constructor(body: BffErrorBody, fallbackStatus: number) {
    super(body.message ?? genericMessageFor(fallbackStatus));
    this.name = 'BffError';
    this.status = body.status ?? fallbackStatus;
    this.code = body.error ?? 'REQUEST_ERROR';
    this.timestamp = body.timestamp;
  }
}

export function isBffError(error: unknown): error is BffError {
  return error instanceof BffError;
}

/** openapi-fetch returns `{data, error}`; call this on a truthy `error` to get a BffError. */
export function toBffError(body: BffErrorBody | undefined, fallbackStatus: number): BffError {
  return new BffError(
    body ?? { status: fallbackStatus, error: 'REQUEST_ERROR', message: genericMessageFor(fallbackStatus) },
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
