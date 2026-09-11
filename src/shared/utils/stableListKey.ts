// Generates a unique id for a React list item's `key` when the underlying
// data has none of its own (e.g. content blocks, social links) and the list
// supports add/remove — using the array index there would make React
// misattribute a row's identity across the resulting shift (typescript:S6479).
// Callers keep one of these per item alongside (not derived from) the data
// itself, updating both in lockstep on add/remove/reorder.
let seq = 0;

export function nextListKey(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}
