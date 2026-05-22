import { tryParse } from '../parser/parse.js';
import type { ParseOptions } from '../parser/parse.js';
import type { ValidationError, ValidationResult } from '../parser/errors.js';
import { quartzDomDowRule } from './rules/quartz-dom-dow.js';

export type ValidateOptions = ParseOptions;

/**
 * Validate a cron expression. Returns a structured `ValidationResult` for
 * every input. **Never throws.**
 *
 * @example
 * ```ts
 * import { validate } from 'cronforge';
 *
 * const r = validate('0 0 12 * * MON', { mode: 'quartz' });
 * if (!r.valid) for (const e of r.errors) console.error(e.code, e.message);
 * ```
 */
export function validate(expression: string, options: ValidateOptions): ValidationResult {
  let parsed;
  try {
    parsed = tryParse(expression, options);
  } catch (e) {
    return wrapUnexpected(expression, e);
  }
  if (!parsed.ok) return { valid: false, errors: parsed.error.errors };

  const errors: ValidationError[] = [];
  for (const e of quartzDomDowRule(parsed.value)) errors.push(e);
  return { valid: errors.length === 0, errors: Object.freeze(errors) };
}

function wrapUnexpected(expression: string, e: unknown): ValidationResult {
  const message = e instanceof Error ? e.message : String(e);
  return {
    valid: false,
    errors: Object.freeze([
      {
        field: 'whole',
        position: { start: 0, end: expression.length },
        code: 'internal-error',
        message: `Internal validator error: ${message}`,
        suggestion: null,
      },
    ]),
  };
}
