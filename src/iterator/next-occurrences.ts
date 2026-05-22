import { parse } from '../parser/parse.js';
import { ParseError } from '../parser/errors.js';
import type { CronMode } from '../ast/dialect.js';
import type { CronExpression } from '../ast/nodes.js';
import { getWallClock, wallClockToUtc } from './tz.js';
import type { WallClock } from './tz.js';
import { matches, nextMatch } from './field-match.js';
import { dayMatches } from './day-match.js';
import { MAX_ITERATION_STEPS } from './dst.js';

export interface NextOccurrencesOptions {
  readonly mode: CronMode;
  readonly startFrom?: Date;
  /** IANA timezone name (default `'UTC'`). */
  readonly timezone?: string;
}

const DEFAULT_TZ = 'UTC';
const QUARTZ_MIN_YEAR = 1970;
const QUARTZ_MAX_YEAR = 2199;

/**
 * Compute the next `count` fire times strictly after `options.startFrom`
 * (default: now). Returns a frozen array in ascending order.
 *
 * Throws `ParseError` for `@reboot` (`reboot-not-iterable`), invalid
 * `count`, invalid `startFrom`, or when no match is found within the
 * iteration ceiling (`no-match-in-search-window`).
 *
 * @example
 * ```ts
 * import { nextOccurrences } from 'cronforge';
 *
 * nextOccurrences('*\/5 * * * *', 3, {
 *   mode: 'standard',
 *   startFrom: new Date('2026-06-01T10:00:00Z'),
 *   timezone: 'UTC',
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
    throw new ParseError({
      message: `count must be a non-negative integer (got ${count})`,
      code: 'invalid-count',
      errors: [],
      source: '',
    });
  }
  if (count === 0) return Object.freeze([]);
  if (count > 100_000) {
    throw new ParseError({
      message: `count ${count} exceeds the maximum (100_000)`,
      code: 'count-too-large',
      errors: [],
      source: '',
    });
  }

  const expr: CronExpression =
    typeof input === 'string' ? parse(input, { mode: options.mode }) : input;

  if (expr.hasReboot) {
    throw new ParseError({
      message: '@reboot has no schedule; nextOccurrences() cannot iterate it',
      code: 'reboot-not-iterable',
      errors: [],
      source: expr.source,
    });
  }

  const tz = options.timezone ?? DEFAULT_TZ;
  const startFrom = options.startFrom ?? new Date();
  if (Number.isNaN(startFrom.getTime())) {
    throw new ParseError({
      message: 'startFrom is an invalid Date',
      code: 'invalid-start-from',
      errors: [],
      source: expr.source,
    });
  }

  const results: Date[] = [];
  let current = startFrom;
  for (let i = 0; i < count; i++) {
    const next = computeNext(expr, current, tz);
    results.push(next);
    current = next;
  }
  return Object.freeze(results);
}

function computeNext(expr: CronExpression, fromUtc: Date, tz: string): Date {
  const hasSeconds = expr.fields.seconds !== undefined;
  const stepMs = hasSeconds ? 1000 : 60_000;

  // One tick after `fromUtc`, rounded up to the field-precision boundary.
  let candidate = new Date(Math.ceil((fromUtc.getTime() + 1) / stepMs) * stepMs);

  for (let iter = 0; iter < MAX_ITERATION_STEPS; iter++) {
    const wc = getWallClock(candidate, tz);

    if (expr.fields.year !== undefined && !matches(expr.fields.year, wc.year)) {
      const ny = nextMatch(expr.fields.year, wc.year + 1, QUARTZ_MIN_YEAR, QUARTZ_MAX_YEAR);
      if (ny === null) throw noMatchError(expr);
      candidate = wallClockToUtc(
        { year: ny, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
        tz,
      );
      continue;
    }

    if (!matches(expr.fields.month, wc.month)) {
      const nm = nextMatch(expr.fields.month, wc.month + 1, 1, 12);
      candidate = wallClockToUtc(
        nm === null
          ? { year: wc.year + 1, month: 1, day: 1, hour: 0, minute: 0, second: 0 }
          : { year: wc.year, month: nm, day: 1, hour: 0, minute: 0, second: 0 },
        tz,
      );
      continue;
    }

    if (!dayMatches(expr, wc)) {
      candidate = wallClockToUtc(
        { year: wc.year, month: wc.month, day: wc.day + 1, hour: 0, minute: 0, second: 0 },
        tz,
      );
      continue;
    }

    if (!matches(expr.fields.hour, wc.hour)) {
      const nh = nextMatch(expr.fields.hour, wc.hour + 1, 0, 23);
      candidate = nh === null
        ? advanceField(wc, 'day', tz)
        : wallClockToUtc(
            { year: wc.year, month: wc.month, day: wc.day, hour: nh, minute: 0, second: 0 },
            tz,
          );
      continue;
    }

    if (!matches(expr.fields.minute, wc.minute)) {
      const nmin = nextMatch(expr.fields.minute, wc.minute + 1, 0, 59);
      candidate = nmin === null
        ? advanceField(wc, 'hour', tz)
        : wallClockToUtc(
            { year: wc.year, month: wc.month, day: wc.day, hour: wc.hour, minute: nmin, second: 0 },
            tz,
          );
      continue;
    }

    if (expr.fields.seconds !== undefined && !matches(expr.fields.seconds, wc.second)) {
      const ns = nextMatch(expr.fields.seconds, wc.second + 1, 0, 59);
      candidate = ns === null
        ? advanceField(wc, 'minute', tz)
        : wallClockToUtc(
            {
              year: wc.year, month: wc.month, day: wc.day,
              hour: wc.hour, minute: wc.minute, second: ns,
            },
            tz,
          );
      continue;
    }

    return candidate;
  }

  throw noMatchError(expr);
}

function advanceField(wc: WallClock, field: 'day' | 'hour' | 'minute', tz: string): Date {
  switch (field) {
    case 'day':
      return wallClockToUtc(
        { year: wc.year, month: wc.month, day: wc.day + 1, hour: 0, minute: 0, second: 0 },
        tz,
      );
    case 'hour':
      return wallClockToUtc(
        { year: wc.year, month: wc.month, day: wc.day, hour: wc.hour + 1, minute: 0, second: 0 },
        tz,
      );
    case 'minute':
      return wallClockToUtc(
        {
          year: wc.year, month: wc.month, day: wc.day,
          hour: wc.hour, minute: wc.minute + 1, second: 0,
        },
        tz,
      );
  }
}

function noMatchError(expr: CronExpression): ParseError {
  return new ParseError({
    message: `nextOccurrences could not find a match within ${MAX_ITERATION_STEPS} iteration steps`,
    code: 'no-match-in-search-window',
    errors: [],
    source: expr.source,
  });
}
