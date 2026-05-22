import type { FieldName, SourcePosition } from '../ast/dialect.js';

/**
 * One concrete issue identified by the validator or the parser. Stable
 * across versions: consumers may key UI translation off `code`.
 */
export interface ValidationError {
  readonly field: FieldName | null;
  readonly position: SourcePosition;
  readonly code: string;
  readonly message: string;
  readonly suggestion: string | null;
}

/**
 * Aggregate result returned by `validate()`. Always populated; `validate()`
 * NEVER throws (Constitution Principle III, FR-004).
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<ValidationError>;
}

/**
 * Thrown by `parse()`. Returned (not thrown) by `tryParse()` and the safe
 * builder variants. A real `Error` subclass so existing `try/catch` and
 * `instanceof Error` checks work.
 *
 * @example
 * ```ts
 * try {
 *   parse('not a cron', { mode: 'standard' });
 * } catch (e) {
 *   if (e instanceof ParseError) {
 *     console.log(e.code, e.errors);
 *   }
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
