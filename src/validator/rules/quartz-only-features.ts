import type { FieldName, ResolvedCronMode, SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

/**
 * Reject Quartz-only syntactic features (`?`, `L`, `W`, `#`) when they
 * appear in standard mode. Called by the field parser at each
 * site that might encounter one.
 */
export function checkQuartzOnlyFeature(
  feature: '?' | 'L' | 'W' | '#',
  dialect: ResolvedCronMode,
  field: FieldName,
  position: SourcePosition,
): ValidationError | null {
  if (dialect === 'standard') {
    return {
      field,
      position,
      code: 'quartz-only-feature-in-standard',
      message: `'${feature}' is a Quartz-only feature; not allowed in standard mode (${field})`,
      suggestion: "Use mode: 'quartz' or rewrite without this character",
    };
  }
  return null;
}
