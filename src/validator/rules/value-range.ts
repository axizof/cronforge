import type { FieldMeta } from '../../parser/field-meta.js';
import type { SourcePosition } from '../../ast/dialect.js';
import type { ValidationError } from '../../parser/errors.js';

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
