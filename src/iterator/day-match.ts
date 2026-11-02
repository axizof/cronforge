import { QUARTZ_META, STANDARD_META } from '../parser/field-meta.js';
import { matches } from '../ast/field-match.js';
import { dayOfWeek, daysInMonth } from './tz.js';
import type { WallClock } from './tz.js';
import type { CronExpression, FieldAst } from '../ast/nodes.js';
import type { ResolvedCronMode } from '../ast/dialect.js';

/**
 * Match a wall-clock date against the expression's dom + dow fields.
 *
 * Standard cron follows Vixie cron / cronie: when either field starts with
 * `*` both must match, otherwise a day matching either one fires
 * (`0 0 1 * MON` = the 1st of the month OR any Monday). Quartz requires `?`
 * on one side, so only the other side applies.
 */
export function dayMatches(expr: CronExpression, wc: WallClock): boolean {
  const { dom, dow } = expr.fields;

  if (expr.dialect === 'quartz') {
    if (dom.kind === 'any') return matchDow(dow, wc, 'quartz');
    if (dow.kind === 'any') return matchDom(dom, wc);
    return matchDom(dom, wc) && matchDow(dow, wc, 'quartz');
  }

  if (startsWithStar(dom) || startsWithStar(dow)) {
    return matchDom(dom, wc) && matchDow(dow, wc, 'standard');
  }
  return matchDom(dom, wc) || matchDow(dow, wc, 'standard');
}

export function startsWithStar(ast: FieldAst): boolean {
  return ast.kind === 'wildcard' || (ast.kind === 'step' && ast.base.kind === 'wildcard');
}

function matchDom(dom: FieldAst, wc: WallClock): boolean {
  switch (dom.kind) {
    case 'lastDom':
      return wc.day === daysInMonth(wc.year, wc.month) - dom.offset;
    case 'lastWeekday':
      return wc.day === lastWeekdayOfMonth(wc.year, wc.month);
    case 'weekdayNearest':
      return wc.day === nearestWeekday(dom.day, wc.year, wc.month);
    default:
      return matches(dom, wc.day, STANDARD_META.dom);
  }
}

function matchDow(dow: FieldAst, wc: WallClock, dialect: ResolvedCronMode): boolean {
  switch (dow.kind) {
    // `nL` and `n#m` only exist in Quartz, where SUN = 1.
    case 'lastDow':
      return wc.dow === dow.weekday - 1 && daysInMonth(wc.year, wc.month) - wc.day < 7;
    case 'nthDow':
      return wc.dow === dow.weekday - 1 && Math.ceil(wc.day / 7) === dow.nth;
    default:
      if (dialect === 'quartz') return matches(dow, wc.dow + 1, QUARTZ_META.dow);
      return (
        matches(dow, wc.dow, STANDARD_META.dow) ||
        (wc.dow === 0 && matches(dow, 7, STANDARD_META.dow))
      );
  }
}

function lastWeekdayOfMonth(year: number, month: number): number {
  const last = daysInMonth(year, month);
  const dow = dayOfWeek(year, month, last);
  if (dow === 6) return last - 1;
  if (dow === 0) return last - 2;
  return last;
}

/**
 * Quartz `nW`: the weekday nearest to day `n`, without leaving the month.
 * Saturday → Friday before (or Monday after when `n` is the 1st); Sunday →
 * Monday after (or Friday before when `n` is the last day). `null` when the
 * month has no day `n`.
 */
function nearestWeekday(target: number, year: number, month: number): number | null {
  const last = daysInMonth(year, month);
  if (target > last) return null;
  const dow = dayOfWeek(year, month, target);
  if (dow === 6) return target === 1 ? 3 : target - 1;
  if (dow === 0) return target === last ? target - 2 : target + 1;
  return target;
}
