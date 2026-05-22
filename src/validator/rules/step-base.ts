import type { FieldName, SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

export function checkStep(
  baseKind: 'wildcard' | 'range' | 'value' | 'other',
  step: number,
  field: FieldName,
  position: SourcePosition,
): ValidationError | null {
  if (!Number.isInteger(step) || step < 1) {
    return {
      field,
      position,
      code: 'step-not-positive',
      message: `Step ${step} must be a positive integer in ${field}`,
      suggestion: null,
    };
  }
  if (baseKind !== 'wildcard' && baseKind !== 'range') {
    return {
      field,
      position,
      code: 'step-base-invalid',
      message: `Step base must be '*' or a range in ${field}`,
      suggestion: 'Use "*/N" or "from-to/N"',
    };
  }
  return null;
}
