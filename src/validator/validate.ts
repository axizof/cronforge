import { tryParse } from '../parser/parse.js';
import type { ParseOptions } from '../parser/parse.js';
import type { ValidationResult } from '../parser/errors.js';
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
  const parsed = tryParse(expression, options);
  if (!parsed.ok) return { valid: false, errors: parsed.error.errors };

  const errors = quartzDomDowRule(parsed.value);
  return { valid: errors.length === 0, errors: Object.freeze([...errors]) };
}
