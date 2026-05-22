import type { CronExpression } from '../../ast/nodes.js';
import type { ValidationError } from '../../parser/errors.js';

/** Quartz requires exactly one of dom / dow to be `?`. Standard cron uses
 *  OR semantics and does not fire this rule. */
export function quartzDomDowRule(expr: CronExpression): ReadonlyArray<ValidationError> {
  if (expr.dialect !== 'quartz') return [];
  if (expr.macro !== null) return [];

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
