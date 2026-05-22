import type { FieldMeta } from '../../parser/field-meta.js';
import type { SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

/**
 * Validate that a numeric value lies inside the field's declared range.
 * Returns `null` on success, a `ValidationError` on failure.
 *
 * Called by the field parser at every literal-value site (single value,
 * range endpoint, mnemonic resolution).
 */
export function checkValueInRange(
  value: number,
  meta: FieldMeta,
  position: SourcePosition,
): ValidationError | null {
  if (!Number.isInteger(value) || value < meta.min || value > meta.max) {
    return {
      field: meta.name,
      position,
      code: 'value-out-of-range',
      message: `Value ${value} is out of range for ${meta.name} (allowed: ${meta.min}–${meta.max})`,
      suggestion: null,
    };
  }
  return null;
}

/**
 * Validate that `from <= to` after numeric resolution.
 */
export function checkRangeBounds(
  from: number,
  to: number,
  meta: FieldMeta,
  position: SourcePosition,
): ValidationError | null {
  if (from > to) {
    return {
      field: meta.name,
      position,
      code: 'range-inverted',
      message: `Range ${from}-${to} is inverted (from > to) in ${meta.name}`,
      suggestion: `Swap the endpoints: ${to}-${from}`,
    };
  }
  return null;
}
