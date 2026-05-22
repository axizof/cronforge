import type { FieldName, SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

/**
 * Validate that a step expression is well-formed: the step itself is a
 * positive integer ≥ 1, and the base form is one of `*` or `from-to`
 * (single literal values like `5/2` are forbidden - they would be
 * implementation-defined; we follow Quartz docs and reject).
 *
 * The parser passes the already-classified `baseKind` to keep this rule
 * agnostic of the lexer.
 */
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
