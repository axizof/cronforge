import type { FieldName } from '../ast/dialect.js';

/**
 * Structured error returned by `buildResult()` (or attached to the
 * `ParseError` thrown by `build()`) when a `CronBuilderInput` is invalid
 * or incompatible with the requested mode.
 *
 * Stable `code` vocabulary (see contracts/builder-input.md):
 *   - `mode-incompatibility` - Quartz-only variant requested with
 *     `mode: 'standard'`.
 *   - `out-of-range`         - numeric field outside its allowed range.
 *   - `empty-list`           - a list field was empty.
 *   - `composite-empty`      - `composite.parts` was empty.
 *   - `composite-mode-mismatch` - a composite contained an incompatible
 *     variant.
 */
export interface BuildError {
  readonly code: string;
  readonly message: string;
  readonly field?: FieldName;
}

/** Build a frozen `BuildError`. */
export function makeBuildError(args: BuildError): BuildError {
  const value: BuildError =
    args.field !== undefined
      ? { code: args.code, message: args.message, field: args.field }
      : { code: args.code, message: args.message };
  return Object.freeze(value);
}
