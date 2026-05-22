import type { FieldName, ResolvedCronMode } from '../ast/dialect.js';

/**
 * Compile-time description of a single cron field - its name, numeric
 * range, allowed mnemonics, and the Quartz-only feature set it permits.
 *
 * One `FieldMeta` per (dialect, field) pair is exported from this module
 * via `getFieldMeta`. The field parser consults the meta when interpreting
 * lexemes; the validator consults the meta when checking ranges.
 */
export interface FieldMeta {
  readonly name: FieldName;
  readonly min: number;
  readonly max: number;
  readonly mnemonics?: Readonly<Record<string, number>>;
  readonly allowAny?: boolean;
  readonly allowLastDom?: boolean;
  readonly allowWeekdayNearest?: boolean;
  readonly allowLastDow?: boolean;
  readonly allowNthDow?: boolean;
}

const MONTH_MNEMONICS: Readonly<Record<string, number>> = Object.freeze({
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
});

const STD_DOW_MNEMONICS: Readonly<Record<string, number>> = Object.freeze({
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
});

const QUARTZ_DOW_MNEMONICS: Readonly<Record<string, number>> = Object.freeze({
  SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7,
});

const STANDARD_META: Readonly<Record<string, FieldMeta>> = Object.freeze({
  minute: { name: 'minute', min: 0, max: 59 },
  hour:   { name: 'hour',   min: 0, max: 23 },
  dom:    { name: 'dom',    min: 1, max: 31 },
  month:  { name: 'month',  min: 1, max: 12, mnemonics: MONTH_MNEMONICS },
  dow:    { name: 'dow',    min: 0, max: 6,  mnemonics: STD_DOW_MNEMONICS },
});

const QUARTZ_META: Readonly<Record<string, FieldMeta>> = Object.freeze({
  seconds: { name: 'seconds', min: 0, max: 59 },
  minute:  { name: 'minute',  min: 0, max: 59 },
  hour:    { name: 'hour',    min: 0, max: 23 },
  dom: {
    name: 'dom',
    min: 1,
    max: 31,
    allowAny: true,
    allowLastDom: true,
    allowWeekdayNearest: true,
  },
  month: { name: 'month', min: 1, max: 12, mnemonics: MONTH_MNEMONICS },
  dow: {
    name: 'dow',
    min: 1,
    max: 7,
    mnemonics: QUARTZ_DOW_MNEMONICS,
    allowAny: true,
    allowLastDow: true,
    allowNthDow: true,
  },
  year: { name: 'year', min: 1970, max: 2199 },
});

/**
 * Return the metadata for one (dialect, field) pair. Returns `null` for
 * field/dialect combinations that do not exist (e.g. `'seconds'` in
 * standard mode).
 */
export function getFieldMeta(
  dialect: ResolvedCronMode,
  field: FieldName,
): FieldMeta | null {
  const table = dialect === 'standard' ? STANDARD_META : QUARTZ_META;
  return table[field] ?? null;
}

/**
 * Canonical ordering of fields for a given dialect - the order in which
 * raw tokens map to fields. Standard always has 5; Quartz has 6 or 7.
 */
export function fieldOrderFor(
  dialect: ResolvedCronMode,
  tokenCount: number,
): ReadonlyArray<FieldName> | null {
  if (dialect === 'standard') {
    return tokenCount === 5 ? ['minute', 'hour', 'dom', 'month', 'dow'] : null;
  }
  if (tokenCount === 6) return ['seconds', 'minute', 'hour', 'dom', 'month', 'dow'];
  if (tokenCount === 7) return ['seconds', 'minute', 'hour', 'dom', 'month', 'dow', 'year'];
  return null;
}
