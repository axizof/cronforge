import { parse } from '../parser/parse.js';
import { CronError } from '../parser/errors.js';
import { QUARTZ_META, STANDARD_META } from '../parser/field-meta.js';
import type { CronMode } from '../ast/dialect.js';
import type { CronExpression } from '../ast/nodes.js';
import { getWallClock, isValidTimeZone, localToUtc } from './tz.js';
import type { LocalDateTime } from './tz.js';
import { matches, nextMatch } from '../ast/field-match.js';
import { dayMatches } from './day-match.js';

export interface NextOccurrencesOptions {
  readonly mode: CronMode;
  /** Exclusive lower bound. Defaults to now. */
  readonly startFrom?: Date;
  /** IANA timezone name the expression is evaluated in. Defaults to `'UTC'`. */
  readonly timezone?: string;
}

const DEFAULT_TZ = 'UTC';
const MAX_COUNT = 100_000;
// Searching stops after this many years without a match (unless the Quartz
// year field says otherwise). Weekday/leap-year patterns repeat every 28
// years, so any satisfiable expression fires well within it.
const MAX_YEARS_AHEAD = 100;
// Backstop against runaway loops; the year horizon normally stops first.
const MAX_ITERATION_STEPS = 50_000;

/**
 * Compute the next `count` fire times strictly after `options.startFrom`,
 * in ascending order.
 *
 * DST policy: a time that falls in a spring-forward gap is skipped; a time
 * repeated by a fall-back fires once, at its first occurrence.
 *
 * @throws {CronError} on an invalid expression, `@reboot`
 * (`reboot-not-iterable`), invalid `count`, `startFrom` or `timezone`, or
 * when the expression never fires (`no-match-in-search-window`, e.g. Feb 31).
 *
 * @example
 * ```ts
 * import { nextOccurrences } from 'cronforge';
 *
 * nextOccurrences('*\/5 * * * *', 3, {
 *   mode: 'standard',
 *   startFrom: new Date('2026-06-01T10:00:00Z'),
 *   timezone: 'Europe/Paris',
 * });
 * // [2026-06-01T10:05Z, 10:10Z, 10:15Z]
 * ```
 */
export function nextOccurrences(
  input: string | CronExpression,
  count: number,
  options: NextOccurrencesOptions,
): ReadonlyArray<Date> {
  if (!Number.isInteger(count) || count < 0) {
    throw usageError('invalid-count', `count must be a non-negative integer (got ${count})`);
  }
  if (count > MAX_COUNT) {
    throw usageError('count-too-large', `count ${count} exceeds the maximum (${MAX_COUNT})`);
  }

  const expr = typeof input === 'string' ? parse(input, { mode: options.mode }) : input;
  if (expr.hasReboot) {
    throw usageError('reboot-not-iterable', '@reboot has no schedule to iterate', expr.source);
  }

  const tz = options.timezone ?? DEFAULT_TZ;
  if (!isValidTimeZone(tz)) {
    throw usageError('invalid-timezone', `Unknown IANA timezone '${tz}'`, expr.source);
  }

  const startFrom = options.startFrom ?? new Date();
  if (!(startFrom instanceof Date) || Number.isNaN(startFrom.getTime())) {
    throw usageError('invalid-start-from', 'startFrom must be a valid Date', expr.source);
  }

  const results: Date[] = [];
  let current = startFrom;
  for (let i = 0; i < count; i++) {
    current = computeNext(expr, current, tz);
    results.push(current);
  }
  return Object.freeze(results);
}

function computeNext(expr: CronExpression, fromUtc: Date, tz: string): Date {
  const meta = expr.dialect === 'standard' ? STANDARD_META : QUARTZ_META;
  const { seconds, minute, hour, month, year } = expr.fields;
  const stepMs = seconds === undefined ? 60_000 : 1000;

  let candidate = new Date(Math.floor(fromUtc.getTime() / stepMs) * stepMs + stepMs);
  const lastYear =
    year === undefined ? getWallClock(candidate, tz).year + MAX_YEARS_AHEAD : QUARTZ_META.year.max;

  // In a DST overlap the earlier instant of a local time can lie before
  // `candidate`; take the later one so the search never moves backwards.
  const jumpTo = (local: LocalDateTime): Date => {
    const earlier = localToUtc(local, tz, 'earlier');
    return earlier > candidate ? earlier : localToUtc(local, tz, 'later');
  };

  for (let i = 0; i < MAX_ITERATION_STEPS; i++) {
    const wc = getWallClock(candidate, tz);
    if (wc.year > lastYear) break;

    if (year !== undefined && !matches(year, wc.year, QUARTZ_META.year)) {
      const ny = nextMatch(year, wc.year + 1, QUARTZ_META.year);
      if (ny === null) break;
      candidate = jumpTo(startOfDay(ny, 1, 1));
      continue;
    }

    if (!matches(month, wc.month, meta.month)) {
      const nm = nextMatch(month, wc.month + 1, meta.month);
      candidate = jumpTo(nm === null ? startOfDay(wc.year + 1, 1, 1) : startOfDay(wc.year, nm, 1));
      continue;
    }

    if (!dayMatches(expr, wc)) {
      candidate = jumpTo(startOfDay(wc.year, wc.month, wc.day + 1));
      continue;
    }

    if (!matches(hour, wc.hour, meta.hour)) {
      const nh = nextMatch(hour, wc.hour + 1, meta.hour);
      candidate = jumpTo(
        nh === null
          ? startOfDay(wc.year, wc.month, wc.day + 1)
          : { ...wc, hour: nh, minute: 0, second: 0 },
      );
      continue;
    }

    if (!matches(minute, wc.minute, meta.minute)) {
      const nmin = nextMatch(minute, wc.minute + 1, meta.minute);
      candidate = jumpTo(
        nmin === null
          ? { ...wc, hour: wc.hour + 1, minute: 0, second: 0 }
          : { ...wc, minute: nmin, second: 0 },
      );
      continue;
    }

    if (seconds !== undefined && !matches(seconds, wc.second, QUARTZ_META.seconds)) {
      const ns = nextMatch(seconds, wc.second + 1, QUARTZ_META.seconds);
      candidate = jumpTo(
        ns === null ? { ...wc, minute: wc.minute + 1, second: 0 } : { ...wc, second: ns },
      );
      continue;
    }

    return candidate;
  }

  throw usageError(
    'no-match-in-search-window',
    'The expression has no fire time in the search window',
    expr.source,
  );
}

function startOfDay(year: number, month: number, day: number): LocalDateTime {
  return { year, month, day, hour: 0, minute: 0, second: 0 };
}

function usageError(code: string, message: string, source = ''): CronError {
  return new CronError({ message, code, errors: [], source });
}
