import type { CronExpression } from '../../ast/nodes.js';
import type { ValidationError } from '../../parser/errors.js';

/**
 * Post-parse rule enforcing the Quartz `?`-in-one-of-dom/dow constraint
 * (FR-008). In Quartz mode, exactly one of `dom` / `dow` MUST be `?`
 * (Any). If both are non-`?` AND non-wildcard, that is the conflict the
 * Quartz spec rejects. If both are `?`, the cron has no day to fire on -
 * also reject.
 *
 * Standard mode: this rule does not fire (dom/dow OR semantics is
 * permitted, see FR-009).
 *
 * Returns the empty array on success.
 */
export function quartzDomDowRule(expr: CronExpression): ReadonlyArray<ValidationError> {
  if (expr.dialect !== 'quartz') return [];
  if (expr.macro !== null) return []; // macros are pre-expanded; rule does not apply

  const dom = expr.fields.dom;
  const dow = expr.fields.dow;

  const domIsAny = dom.kind === 'any';
  const dowIsAny = dow.kind === 'any';

  if (domIsAny && dowIsAny) {
    return [
      {
        field: 'whole',
        position: { start: 0, end: expr.source.length },
        code: 'quartz-dom-dow-both-any',
        message: 'Both day-of-month and day-of-week are "?" - at least one must specify a value',
        suggestion: 'Replace one of dom/dow with a concrete value or "*"',
      },
    ];
  }

  if (!domIsAny && !dowIsAny) {
    return [
      {
        field: 'whole',
        position: { start: 0, end: expr.source.length },
        code: 'quartz-dom-dow-conflict',
        message:
          'In Quartz, exactly one of day-of-month and day-of-week must be "?" when the other is specified',
        suggestion: 'Replace one of dom/dow with "?"',
      },
    ];
  }

  return [];
}
