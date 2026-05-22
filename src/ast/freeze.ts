/** Recursively freeze plain objects and arrays in place. Skips Date / Map /
 *  Set / RegExp / Promise / typed arrays (already opaque or meaningfully
 *  mutable). Returns the same reference. */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  if (isOpaqueInstance(value)) return value;

  Object.freeze(value);

  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return value;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

function isOpaqueInstance(value: object): boolean {
  return (
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof RegExp ||
    value instanceof Promise ||
    ArrayBuffer.isView(value)
  );
}
