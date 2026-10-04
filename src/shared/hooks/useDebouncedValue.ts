import { useEffect, useState } from 'react';

/**
 * `value`, but only once it has stopped changing for `delayMs` — so a
 * search-as-you-type field fires one request per pause, not per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
