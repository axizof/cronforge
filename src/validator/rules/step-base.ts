import type { FieldName, ResolvedCronMode, SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

export function checkStep(
  baseKind: 'wildcard' | 'range' | 'value' | 'other',
  step: number,
  dialect: ResolvedCronMode,
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
  // Quartz reads `5/15` as "from 5, every 15"; standard cron only allows `*/N` and `a-b/N`.
  const allowsValueBase = dialect === 'quartz' && baseKind === 'value';
  if (baseKind !== 'wildcard' && baseKind !== 'range' && !allowsValueBase) {
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
