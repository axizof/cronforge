import type { ResolvedCronMode, SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

export function fieldCountError(
  dialect: ResolvedCronMode,
  tokenCount: number,
  position: SourcePosition,
): ValidationError {
  if (dialect === 'standard') {
    return {
      field: 'whole',
      position,
      code: 'field-count-standard',
      message: `Standard cron expressions require exactly 5 fields (got ${tokenCount})`,
      suggestion: 'Use mode: "quartz" for 6- or 7-field expressions',
    };
  }
  return {
    field: 'whole',
    position,
    code: 'field-count-quartz',
    message: `Quartz cron expressions require 6 or 7 fields (got ${tokenCount})`,
    suggestion: 'Use mode: "standard" for 5-field expressions',
  };
}
