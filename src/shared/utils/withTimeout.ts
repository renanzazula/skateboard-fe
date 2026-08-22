/**
 * Races a promise against a timeout, rejecting instead of leaving the
 * caller stuck forever. Doesn't cancel the underlying request (fetch here
 * has no signal to abort with) — it just unblocks the caller so a hung
 * network call becomes a visible error/retry instead of an infinite spinner.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
