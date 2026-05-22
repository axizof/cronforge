/**
 * Public `CronBuilderInput` discriminated union and per-variant type
 * guards / validators. See `contracts/builder-input.md` for the
 * authoritative per-variant rules.
 */

import type { ResolvedCronMode } from '../ast/dialect.js';
import { makeBuildError } from './errors.js';
import type { BuildError } from './errors.js';

export type Weekday =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6
  | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export type Month =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  | 'JAN' | 'FEB' | 'MAR' | 'APR' | 'MAY' | 'JUN'
  | 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC';

export interface TimeOfDay {
  readonly hour: number;
  readonly minute: number;
  readonly second?: number;
}

export type CronBuilderInput =
  | { readonly kind: 'everyN'; readonly unit: 'minute' | 'hour' | 'day' | 'month' | 'year'; readonly n: number }
  | { readonly kind: 'at'; readonly times: ReadonlyArray<TimeOfDay> }
  | { readonly kind: 'daysOfWeek'; readonly days: ReadonlyArray<Weekday>; readonly at: TimeOfDay }
  | { readonly kind: 'daysOfMonth'; readonly days: ReadonlyArray<number>; readonly at: TimeOfDay }
  | { readonly kind: 'hourRange'; readonly from: number; readonly to: number; readonly minute?: number }
  | { readonly kind: 'monthRange'; readonly from: Month; readonly to: Month; readonly at?: TimeOfDay }
  | { readonly kind: 'nthWeekdayOfMonth'; readonly nth: 1 | 2 | 3 | 4 | 5; readonly weekday: Weekday; readonly at: TimeOfDay }
  | { readonly kind: 'lastDayOfMonth'; readonly at: TimeOfDay }
  | { readonly kind: 'lastWeekdayOfMonth'; readonly weekday: Weekday; readonly at: TimeOfDay }
  | { readonly kind: 'weekdayNearestTo'; readonly day: number; readonly at: TimeOfDay }
  | { readonly kind: 'composite'; readonly parts: ReadonlyArray<CronBuilderInput> };

const QUARTZ_ONLY_VARIANTS = new Set([
  'nthWeekdayOfMonth',
  'lastDayOfMonth',
  'lastWeekdayOfMonth',
  'weekdayNearestTo',
]);

/**
 * Validate a `CronBuilderInput` against the chosen mode. Returns `null`
 * on success, otherwise a structured `BuildError` (per
 * contracts/builder-input.md §Error contract).
 */
export function validateInput(
  input: CronBuilderInput,
  mode: ResolvedCronMode,
): BuildError | null {
  if (input.kind === 'composite') {
    if (input.parts.length === 0) {
      return makeBuildError({ code: 'composite-empty', message: 'composite.parts is empty' });
    }
    for (const p of input.parts) {
      const err = validateInput(p, mode);
      if (err !== null) {
        return makeBuildError({
          code: 'composite-mode-mismatch',
          message: `composite part '${p.kind}': ${err.message}`,
        });
      }
    }
    return null;
  }
  if (QUARTZ_ONLY_VARIANTS.has(input.kind) && mode === 'standard') {
    return makeBuildError({
      code: 'mode-incompatibility',
      message: `'${input.kind}' is a Quartz-only feature; not allowed in standard mode`,
    });
  }
  switch (input.kind) {
    case 'everyN':
      return validateEveryN(input);
    case 'at':
      return validateAt(input, mode);
    case 'daysOfWeek':
      return input.days.length === 0
        ? makeBuildError({ code: 'empty-list', message: 'daysOfWeek.days is empty' })
        : validateTime(input.at, mode);
    case 'daysOfMonth': {
      if (input.days.length === 0) {
        return makeBuildError({ code: 'empty-list', message: 'daysOfMonth.days is empty' });
      }
      for (const d of input.days) {
        if (!Number.isInteger(d) || d < 1 || d > 31) {
          return makeBuildError({
            code: 'out-of-range',
            message: `daysOfMonth.days[*] must be 1..31 (got ${d})`,
            field: 'dom',
          });
        }
      }
      return validateTime(input.at, mode);
    }
    case 'hourRange':
      if (
        !Number.isInteger(input.from) ||
        !Number.isInteger(input.to) ||
        input.from < 0 ||
        input.to > 23 ||
        input.from > input.to
      ) {
        return makeBuildError({
          code: 'out-of-range',
          message: `hourRange.from/to must be 0..23 and from<=to (got ${input.from}-${input.to})`,
          field: 'hour',
        });
      }
      if (input.minute !== undefined && (input.minute < 0 || input.minute > 59)) {
        return makeBuildError({
          code: 'out-of-range',
          message: `hourRange.minute must be 0..59 (got ${input.minute})`,
          field: 'minute',
        });
      }
      return null;
    case 'monthRange':
      return input.at !== undefined ? validateTime(input.at, mode) : null;
    case 'nthWeekdayOfMonth':
      return validateTime(input.at, mode);
    case 'lastDayOfMonth':
      return validateTime(input.at, mode);
    case 'lastWeekdayOfMonth':
      return validateTime(input.at, mode);
    case 'weekdayNearestTo':
      if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) {
        return makeBuildError({
          code: 'out-of-range',
          message: `weekdayNearestTo.day must be 1..31 (got ${input.day})`,
          field: 'dom',
        });
      }
      return validateTime(input.at, mode);
  }
}

function validateEveryN(
  input: Extract<CronBuilderInput, { kind: 'everyN' }>,
): BuildError | null {
  if (!Number.isInteger(input.n) || input.n < 1) {
    return makeBuildError({
      code: 'out-of-range',
      message: `everyN.n must be a positive integer (got ${input.n})`,
    });
  }
  const max: Record<typeof input.unit, number> = {
    minute: 60,
    hour: 24,
    day: 31,
    month: 12,
    year: 100,
  };
  if (input.n > max[input.unit]) {
    return makeBuildError({
      code: 'out-of-range',
      message: `everyN.n=${input.n} exceeds the maximum for unit '${input.unit}' (${max[input.unit]})`,
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
  return null;
}

function validateTime(t: TimeOfDay, mode: ResolvedCronMode): BuildError | null {
  if (!Number.isInteger(t.hour) || t.hour < 0 || t.hour > 23) {
    return makeBuildError({
      code: 'out-of-range',
      message: `TimeOfDay.hour must be 0..23 (got ${t.hour})`,
      field: 'hour',
    });
  }
  if (!Number.isInteger(t.minute) || t.minute < 0 || t.minute > 59) {
    return makeBuildError({
      code: 'out-of-range',
      message: `TimeOfDay.minute must be 0..59 (got ${t.minute})`,
      field: 'minute',
    });
  }
  if (t.second !== undefined) {
    if (mode !== 'quartz') {
      return makeBuildError({
        code: 'mode-incompatibility',
        message: 'TimeOfDay.second requires mode: "quartz"',
        field: 'seconds',
      });
    }
    if (!Number.isInteger(t.second) || t.second < 0 || t.second > 59) {
      return makeBuildError({
        code: 'out-of-range',
        message: `TimeOfDay.second must be 0..59 (got ${t.second})`,
        field: 'seconds',
      });
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Internal helpers used by per-variant AST builders.
// ---------------------------------------------------------------------------

const MONTH_MAP: Readonly<Record<string, number>> = Object.freeze({
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
});

const STD_DOW_MAP: Readonly<Record<string, number>> = Object.freeze({
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
});

const QUARTZ_DOW_MAP: Readonly<Record<string, number>> = Object.freeze({
  SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7,
});

/** Normalise a `Weekday` literal to its dialect numeric value. */
export function resolveWeekday(w: Weekday, mode: ResolvedCronMode): number {
  if (typeof w === 'number') return w;
  const map = mode === 'standard' ? STD_DOW_MAP : QUARTZ_DOW_MAP;
  return map[w]!;
}

/** Normalise a `Month` literal to its numeric value. */
export function resolveMonth(m: Month): number {
  if (typeof m === 'number') return m;
  return MONTH_MAP[m]!;
}
