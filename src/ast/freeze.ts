/**
 * Recursively `Object.freeze` plain objects and arrays. Returns the same
 * reference. Constitution Principle II requires every public return value
 * to be deeply immutable; calling `deepFreeze` at construction is the
 * runtime half of that guarantee (`readonly` field modifiers handle the
 * compile-time half).
 *
 * Frozen *in place*: plain objects (own enumerable keys) and arrays.
 * Not frozen: `Date`, `Map`, `Set`, `RegExp` instances and any object
 * already frozen. Freezing those would either break expected mutability
 * (`Date`) or be a no-op.
 *
 * @example
 * ```ts
 * const node = deepFreeze({ kind: 'range', from: 1, to: 5 });
 * // node is now frozen; node.from = 99 throws in strict mode.
 * ```
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  if (isOpaqueInstance(value)) return value;

  Object.freeze(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
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
