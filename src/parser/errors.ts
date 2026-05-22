import type { FieldName, SourcePosition } from '../ast/dialect.js';

/** One concrete issue from the parser or validator. `code` is stable
 *  across versions — safe to use as an i18n key. */
export interface ValidationError {
  readonly field: FieldName | null;
  readonly position: SourcePosition;
  readonly code: string;
  readonly message: string;
  readonly suggestion: string | null;
}

/** Aggregate result returned by `validate()`. */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<ValidationError>;
}

/**
 * Thrown by `parse()` and `build()`. Returned (not thrown) by `tryParse()`
 * and `buildResult()`.
 *
 * @example
 * ```ts
 * try {
 *   parse('not a cron', { mode: 'standard' });
 * } catch (e) {
 *   if (e instanceof ParseError) console.log(e.code, e.errors);
 * }
 * ```
 */
export class ParseError extends Error {
  override readonly name = 'ParseError';
  readonly code: string;
  readonly errors: ReadonlyArray<ValidationError>;
  readonly source: string;

  constructor(args: {
    message: string;
    code: string;
    errors: ReadonlyArray<ValidationError>;
    source: string;
  }) {
    super(args.message);
    this.code = args.code;
    this.errors = Object.freeze([...args.errors]);
    this.source = args.source;
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}
