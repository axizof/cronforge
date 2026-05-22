import { matches } from './field-match.js';
import { daysInMonth } from './tz.js';
import type { CronExpression, FieldAst } from '../ast/nodes.js';
import type { WallClock } from './tz.js';

/**
 * True iff the given wall-clock date satisfies the expression's dom and
 * dow constraints, honouring:
 *
 *   - **Standard mode**: OR semantics - match if dom matches OR dow
 *     matches (per FR-009, POSIX crontab(5)).
 *   - **Quartz mode**: exclusive semantics via `?` - exactly one of
 *     dom/dow is `?`; the other carries the constraint.
 *   - **Quartz extras**: `L`, `L-N` (last day of month), `nL` (last
 *     <weekday> of month), `nW` (weekday nearest to N), `n#m` (nth
 *     <weekday> of month).
 */
export function dayMatches(expr: CronExpression, wc: WallClock): boolean {
  const dom = expr.fields.dom;
  const dow = expr.fields.dow;

  if (expr.dialect === 'quartz') {
    if (dom.kind === 'any') return matchDow(dow, wc, 'quartz');
    if (dow.kind === 'any') return matchDom(dom, wc);
    // Spec rule rejects both-specified at validate time, but defensively:
    return matchDom(dom, wc) && matchDow(dow, wc, 'quartz');
  }

  // Standard: OR semantics. A "wildcard" on either side neutralises the
  // OR (Quartz-style "?" doesn't exist here; vendor cron treats `*` in
  // either dom or dow as "no restriction from this side").
  const domW = dom.kind === 'wildcard';
  const dowW = dow.kind === 'wildcard';
  if (domW && dowW) return true;
  if (domW) return matchDow(dow, wc, 'standard');
  if (dowW) return matchDom(dom, wc);
  // Both non-wildcard: classic OR.
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
  // Translate the AST's encoded value (Quartz: SUN=1; standard: SUN=0)
  // into the wall-clock's SUN=0 numbering before comparing.
  const stdDow = wc.dow;
  switch (dow.kind) {
    case 'lastDow':
      return matchLastDow(dow.weekday, wc, dialect);
    case 'nthDow':
      return matchNthDow(dow.weekday, dow.nth, wc, dialect);
    default:
      return matches(dow, encodeWeekday(stdDow, dialect));
  }
}

/** Encode a SUN=0-based weekday into the dialect's numbering. */
function encodeWeekday(stdDow: number, dialect: 'standard' | 'quartz'): number {
  if (dialect === 'standard') return stdDow;
  return stdDow + 1; // Quartz: SUN = 1
}

/** Decode a dialect-encoded weekday back to SUN=0. */
function decodeWeekday(encoded: number, dialect: 'standard' | 'quartz'): number {
  if (dialect === 'standard') return encoded % 7;
  return ((encoded - 1) % 7 + 7) % 7;
}

/** True iff `wc` is the last occurrence of `weekday` in its month. */
function matchLastDow(
  encodedWeekday: number,
  wc: WallClock,
  dialect: 'standard' | 'quartz',
): boolean {
  const targetStd = decodeWeekday(encodedWeekday, dialect);
  if (wc.dow !== targetStd) return false;
  // The last occurrence has 7+ days remaining-to-month-end ≤ 7.
  const remaining = daysInMonth(wc.year, wc.month) - wc.day;
  return remaining < 7;
}

/** True iff `wc` is the `nth`'th occurrence of `weekday` in its month. */
function matchNthDow(
  encodedWeekday: number,
  nth: 1 | 2 | 3 | 4 | 5,
  wc: WallClock,
  dialect: 'standard' | 'quartz',
): boolean {
  const targetStd = decodeWeekday(encodedWeekday, dialect);
  if (wc.dow !== targetStd) return false;
  // Which occurrence of this weekday is wc.day? 1st = day 1..7, 2nd = 8..14, etc.
  const occurrence = Math.ceil(wc.day / 7);
  return occurrence === nth;
}

/**
 * True iff `wc.day` is the weekday nearest to `targetDay` per Quartz `W`
 * semantics:
 *   - If targetDay is a weekday, match exactly that day.
 *   - If it falls on Saturday, match the previous Friday (unless that's
 *     the 0th of the month, in which case match the following Monday).
 *   - If it falls on Sunday, match the following Monday (unless that's
 *     in the next month, in which case match the previous Friday).
 *   - "W" never crosses month boundaries.
 */
function matchWeekdayNearest(targetDay: number, wc: WallClock): boolean {
  const last = daysInMonth(wc.year, wc.month);
  if (targetDay < 1 || targetDay > last) return false;

  // Day-of-week of the target.
  const targetDow = wallClockDowFor(wc.year, wc.month, targetDay);

  if (targetDow >= 1 && targetDow <= 5) {
    // Weekday - match exactly.
    return wc.day === targetDay;
  }
  if (targetDow === 6) {
    // Saturday -> prefer previous Friday (target - 1). If target was day 1,
    // the previous Friday would be in the prior month - fall forward to
    // Monday instead (target + 2).
    if (targetDay === 1) return wc.day === targetDay + 2;
    return wc.day === targetDay - 1;
  }
  // Sunday -> prefer following Monday (target + 1). If that's > last,
  // fall back to the prior Friday (target - 2).
  if (targetDay + 1 > last) return wc.day === targetDay - 2;
  return wc.day === targetDay + 1;
}

function wallClockDowFor(year: number, month: number, day: number): number {
  // Same Zeller as in tz.ts but inlined to avoid a circular import.
  let y = year;
  let m = month;
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  const k = y % 100;
  const j = Math.floor(y / 100);
  const h =
    (day + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return (h + 6) % 7;
}
