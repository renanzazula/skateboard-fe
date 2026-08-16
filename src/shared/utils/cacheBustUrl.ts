/**
 * Appends a cache-busting version param to a URL that may already have its
 * own query string — e.g. a presigned S3 URL's `X-Amz-Signature`. Blindly
 * concatenating `?v=` in that case corrupts the signature (a second `?`
 * becomes part of the last param's value, not a new param), so the server
 * rejects the request and the image silently fails to load.
 */
export function cacheBustUrl(uri: string, version: number): string {
  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}v=${version}`;
}
