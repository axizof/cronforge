import type { SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

/**
 * Build an `unknown-macro` validation error. The recognition check itself
 * lives in `src/parser/macros.ts` (`isRecognisedMacro`); this file
 * centralises the error shape so the parser and validator emit it
 * identically.
 */
export function unknownMacroError(
  lexeme: string,
  position: SourcePosition,
): ValidationError {
  return {
    field: 'whole',
    position,
    code: 'unknown-macro',
    message: `Unknown macro '${lexeme}'`,
    suggestion:
      'Recognised macros: @hourly, @daily, @midnight, @weekly, @monthly, @yearly, @annually, @reboot',
  };
}
