import { matches } from './field-match.js';
import { daysInMonth } from './tz.js';
import type { CronExpression, FieldAst } from '../ast/nodes.js';
import type { WallClock } from './tz.js';

/**
 * Match a wall-clock date against the expression's dom+dow constraints.
 * Standard cron uses OR semantics (POSIX); Quartz uses exclusive
 * semantics via `?`. Handles the Quartz-only `L`, `nL`, `nW`, `n#m`.
 */
export function dayMatches(expr: CronExpression, wc: WallClock): boolean {
  const dom = expr.fields.dom;
  const dow = expr.fields.dow;

  if (expr.dialect === 'quartz') {
    if (dom.kind === 'any') return matchDow(dow, wc, 'quartz');
    if (dow.kind === 'any') return matchDom(dom, wc);
    return matchDom(dom, wc) && matchDow(dow, wc, 'quartz');
  }

  // Standard cron: a wildcard side neutralises the OR.
  const domW = dom.kind === 'wildcard';
  const dowW = dow.kind === 'wildcard';
  if (domW && dowW) return true;
  if (domW) return matchDow(dow, wc, 'standard');
  if (dowW) return matchDom(dom, wc);
  return matchDom(dom, wc) || matchDow(dow, wc, 'standard');
}

function matchDom(dom: FieldAst, wc: WallClock): boolean {
  switch (dom.kind) {
    case 'lastDom': {
      const lastDay = daysInMonth(wc.year, wc.month);
      return wc.day === lastDay - dom.offset;
    }
    case 'weekdayNearest':
      return matchWeekdayNearest(dom.day, wc);
    default:
      return matches(dom, wc.day);
  }
}

function matchDow(dow: FieldAst, wc: WallClock, dialect: 'standard' | 'quartz'): boolean {
  switch (dow.kind) {
    case 'lastDow':
      return matchLastDow(dow.weekday, wc, dialect);
    case 'nthDow':
      return matchNthDow(dow.weekday, dow.nth, wc, dialect);
    default:
      return matches(dow, encodeWeekday(wc.dow, dialect));
  }
}

function encodeWeekday(stdDow: number, dialect: 'standard' | 'quartz'): number {
  return dialect === 'standard' ? stdDow : stdDow + 1;
}

function decodeWeekday(encoded: number, dialect: 'standard' | 'quartz'): number {
  if (dialect === 'standard') return encoded % 7;
  return ((encoded - 1) % 7 + 7) % 7;
}

function matchLastDow(
  encodedWeekday: number,
  wc: WallClock,
  dialect: 'standard' | 'quartz',
): boolean {
  const targetStd = decodeWeekday(encodedWeekday, dialect);
  if (wc.dow !== targetStd) return false;
  // Last occurrence is the one with < 7 days left in the month.
  return daysInMonth(wc.year, wc.month) - wc.day < 7;
}

function matchNthDow(
  encodedWeekday: number,
  nth: 1 | 2 | 3 | 4 | 5,
  wc: WallClock,
  dialect: 'standard' | 'quartz',
): boolean {
  const targetStd = decodeWeekday(encodedWeekday, dialect);
  if (wc.dow !== targetStd) return false;
  return Math.ceil(wc.day / 7) === nth;
}

/**
 * Quartz `W`: nearest weekday to `targetDay` without crossing month
 * boundary. Saturday → previous Friday (or Mon +2 if target was day 1).
 * Sunday → next Monday (or Fri -2 if Mon spills into next month).
 */
function matchWeekdayNearest(targetDay: number, wc: WallClock): boolean {
  const last = daysInMonth(wc.year, wc.month);
  if (targetDay < 1 || targetDay > last) return false;

  const targetDow = wallClockDowFor(wc.year, wc.month, targetDay);
  if (targetDow >= 1 && targetDow <= 5) return wc.day === targetDay;
  if (targetDow === 6) {
    return wc.day === (targetDay === 1 ? targetDay + 2 : targetDay - 1);
  }
  return wc.day === (targetDay + 1 > last ? targetDay - 2 : targetDay + 1);
}

function wallClockDowFor(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m < 3) { m += 12; y -= 1; }
  const k = y % 100;
  const j = Math.floor(y / 100);
  const h =
    (day + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return (h + 6) % 7;
}
