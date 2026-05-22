/**
 * Discriminated-union result type used by `tryParse()` and `buildResult()`.
 *
 * Consumers narrow with `result.ok`:
 *
 * @example
 * ```ts
 * const r: Result<number, Error> = ok(42);
 * if (r.ok) {
 *   console.log(r.value); // 42
 * } else {
 *   console.error(r.error);
 * }
 * ```
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construct a successful `Result`. */
export function ok<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value };
}

/** Construct a failed `Result`. */
export function err<E>(error: E): { readonly ok: false; readonly error: E } {
  return { ok: false, error };
}
