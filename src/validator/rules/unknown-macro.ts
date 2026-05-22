import type { SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

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
