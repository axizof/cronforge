import type { ResolvedCronMode } from '../ast/dialect.js';
import { MONTH_MNEMONICS, STD_DOW_MNEMONICS } from '../parser/field-meta.js';
import { makeBuildError } from './errors.js';
import type { BuildError } from './errors.js';

/** Day of week. Numbers always use 0 = Sunday, whatever the mode. */
export type Weekday =
  0 | 1 | 2 | 3 | 4 | 5 | 6 | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export type Month =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 'JAN'
  | 'FEB'
  | 'MAR'
  | 'APR'
  | 'MAY'
  | 'JUN'
  | 'JUL'
  | 'AUG'
  | 'SEP'
  | 'OCT'
  | 'NOV'
  | 'DEC';

/** `second` is Quartz-only. */
export interface TimeOfDay {
  readonly hour: number;
  readonly minute: number;
  readonly second?: number;
}

/**
 * Structured description of a schedule, one variant per kind of form.
 *
 * `everyN` uses cron step semantics: `{ unit: 'day', n: 10 }` fires on days
 * 1, 11, 21 and 31, then restarts on the 1st of the next month.
 * `at` accepts several times only when they form a grid (every hour × every
 * minute listed), since one cron expression cannot express 09:00 + 17:30.
 * The last four variants are Quartz-only.
 */
export type CronBuilderInput =
  | {
      readonly kind: 'everyN';
      readonly unit: 'minute' | 'hour' | 'day' | 'month' | 'year';
      readonly n: number;
    }
  | { readonly kind: 'at'; readonly times: ReadonlyArray<TimeOfDay> }
  | { readonly kind: 'daysOfWeek'; readonly days: ReadonlyArray<Weekday>; readonly at: TimeOfDay }
  | { readonly kind: 'daysOfMonth'; readonly days: ReadonlyArray<number>; readonly at: TimeOfDay }
  | {
      readonly kind: 'hourRange';
      readonly from: number;
      readonly to: number;
      readonly minute?: number;
    }
  | {
      readonly kind: 'monthRange';
      readonly from: Month;
      readonly to: Month;
      readonly at?: TimeOfDay;
    }
  | {
      readonly kind: 'nthWeekdayOfMonth';
      readonly nth: 1 | 2 | 3 | 4 | 5;
      readonly weekday: Weekday;
      readonly at: TimeOfDay;
    }
  | { readonly kind: 'lastDayOfMonth'; readonly at: TimeOfDay }
  | { readonly kind: 'lastWeekdayOfMonth'; readonly weekday: Weekday; readonly at: TimeOfDay }
  | { readonly kind: 'weekdayNearestTo'; readonly day: number; readonly at: TimeOfDay };

const QUARTZ_ONLY_VARIANTS: ReadonlySet<CronBuilderInput['kind']> = new Set([
  'nthWeekdayOfMonth',
  'lastDayOfMonth',
  'lastWeekdayOfMonth',
  'weekdayNearestTo',
]);

const EVERY_N_MAX = { minute: 60, hour: 24, day: 31, month: 12, year: 100 } as const;

export function validateInput(input: CronBuilderInput, mode: ResolvedCronMode): BuildError | null {
  if (QUARTZ_ONLY_VARIANTS.has(input.kind) && mode === 'standard') {
    return makeBuildError({
      code: 'mode-incompatibility',
      message: `'${input.kind}' is a Quartz-only feature; not allowed in standard mode`,
    });
  }
  switch (input.kind) {
    case 'everyN':
      return validateEveryN(input, mode);
    case 'at':
      return validateAt(input, mode);
    case 'daysOfWeek':
      if (input.days.length === 0) {
        return makeBuildError({ code: 'empty-list', message: 'daysOfWeek.days is empty' });
      }
      return (
        input.days.map(validateWeekday).find((e) => e !== null) ?? validateTime(input.at, mode)
      );
    case 'daysOfMonth':
      if (input.days.length === 0) {
        return makeBuildError({ code: 'empty-list', message: 'daysOfMonth.days is empty' });
      }
      for (const d of input.days) {
        if (!isIntIn(d, 1, 31)) {
          return outOfRange(`daysOfMonth.days[*] must be 1..31 (got ${d})`, 'dom');
        }
      }
      return validateTime(input.at, mode);
    case 'hourRange':
      if (!isIntIn(input.from, 0, 23) || !isIntIn(input.to, 0, 23) || input.from > input.to) {
        return outOfRange(
          `hourRange.from/to must be 0..23 and from <= to (got ${input.from}-${input.to})`,
          'hour',
        );
      }
      if (input.minute !== undefined && !isIntIn(input.minute, 0, 59)) {
        return outOfRange(`hourRange.minute must be 0..59 (got ${input.minute})`, 'minute');
      }
      return null;
    case 'monthRange':
      if (resolveMonth(input.from) > resolveMonth(input.to)) {
        return outOfRange(`monthRange.from must not be after monthRange.to`, 'month');
      }
      return input.at === undefined ? null : validateTime(input.at, mode);
    case 'nthWeekdayOfMonth':
    case 'lastWeekdayOfMonth':
      return validateWeekday(input.weekday) ?? validateTime(input.at, mode);
    case 'lastDayOfMonth':
      return validateTime(input.at, mode);
    case 'weekdayNearestTo':
      if (!isIntIn(input.day, 1, 31)) {
        return outOfRange(`weekdayNearestTo.day must be 1..31 (got ${input.day})`, 'dom');
      }
      return validateTime(input.at, mode);
    default:
      // Reachable from untyped JavaScript callers only.
      return makeBuildError({
        code: 'unknown-kind',
        message: `Unknown builder input kind '${String((input as { kind: unknown }).kind)}'`,
      });
  }
}

function validateEveryN(
  input: Extract<CronBuilderInput, { kind: 'everyN' }>,
  mode: ResolvedCronMode,
): BuildError | null {
  const max = EVERY_N_MAX[input.unit];
  if (!isIntIn(input.n, 1, max)) {
    return outOfRange(
      `everyN.n must be an integer in 1..${max} for unit '${input.unit}' (got ${input.n})`,
    );
  }
  if (input.unit === 'year' && input.n > 1 && mode === 'standard') {
    return makeBuildError({
      code: 'mode-incompatibility',
      message: 'Standard cron has no year field; every N years requires mode: "quartz"',
    });
  }
  return null;
}

function validateAt(
  input: Extract<CronBuilderInput, { kind: 'at' }>,
  mode: ResolvedCronMode,
): BuildError | null {
  if (input.times.length === 0) {
    return makeBuildError({ code: 'empty-list', message: 'at.times is empty' });
  }
  for (const t of input.times) {
    const err = validateTime(t, mode);
    if (err !== null) return err;
  }
  if (!isTimeGrid(input.times)) {
    return makeBuildError({
      code: 'times-not-expressible',
      message:
        'at.times must combine every listed hour with every listed minute (e.g. 09:00, 09:30, 17:00, 17:30); use one expression per time otherwise',
    });
  }
  return null;
}

// A cron expression fires on the cartesian product hours × minutes × seconds,
// so the requested times must be exactly that product.
function isTimeGrid(times: ReadonlyArray<TimeOfDay>): boolean {
  const distinct = new Set(times.map((t) => `${t.hour}:${t.minute}:${t.second ?? 0}`));
  const hours = new Set(times.map((t) => t.hour));
  const minutes = new Set(times.map((t) => t.minute));
  const seconds = new Set(times.map((t) => t.second ?? 0));
  return distinct.size === hours.size * minutes.size * seconds.size;
}

function validateTime(t: TimeOfDay, mode: ResolvedCronMode): BuildError | null {
  if (!isIntIn(t.hour, 0, 23)) {
    return outOfRange(`TimeOfDay.hour must be 0..23 (got ${t.hour})`, 'hour');
  }
  if (!isIntIn(t.minute, 0, 59)) {
    return outOfRange(`TimeOfDay.minute must be 0..59 (got ${t.minute})`, 'minute');
  }
  if (t.second === undefined) return null;
  if (mode !== 'quartz') {
    return makeBuildError({
      code: 'mode-incompatibility',
      message: 'TimeOfDay.second requires mode: "quartz"',
      field: 'seconds',
    });
  }
  if (!isIntIn(t.second, 0, 59)) {
    return outOfRange(`TimeOfDay.second must be 0..59 (got ${t.second})`, 'seconds');
  }
  return null;
}

function validateWeekday(w: Weekday): BuildError | null {
  if (typeof w === 'string' || isIntIn(w, 0, 6)) return null;
  return outOfRange(`Weekday must be 0..6 (0 = Sunday) or SUN..SAT (got ${String(w)})`, 'dow');
}

function isIntIn(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n >= min && n <= max;
}

function outOfRange(message: string, field?: BuildError['field']): BuildError {
  return makeBuildError(
    field === undefined
      ? { code: 'out-of-range', message }
      : { code: 'out-of-range', message, field },
  );
}

/** Weekday encoded for the target dialect (Quartz: SUN = 1). */
export function resolveWeekday(w: Weekday, mode: ResolvedCronMode): number {
  const sundayZero = typeof w === 'number' ? w : STD_DOW_MNEMONICS[w];
  return mode === 'quartz' ? sundayZero + 1 : sundayZero;
}

export function resolveMonth(m: Month): number {
  return typeof m === 'number' ? m : MONTH_MNEMONICS[m];
}
