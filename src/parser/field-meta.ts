import type { FieldName, ResolvedCronMode } from '../ast/dialect.js';

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

export const MONTH_MNEMONICS = Object.freeze({
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
});

export const STD_DOW_MNEMONICS = Object.freeze({
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
});

const QUARTZ_DOW_MNEMONICS = Object.freeze({
  SUN: 1,
  MON: 2,
  TUE: 3,
  WED: 4,
  THU: 5,
  FRI: 6,
  SAT: 7,
});

type StandardField = 'minute' | 'hour' | 'dom' | 'month' | 'dow';
type QuartzField = StandardField | 'seconds' | 'year';

export const STANDARD_META: Readonly<Record<StandardField, FieldMeta>> = Object.freeze({
  minute: { name: 'minute', min: 0, max: 59 },
  hour: { name: 'hour', min: 0, max: 23 },
  dom: { name: 'dom', min: 1, max: 31 },
  month: { name: 'month', min: 1, max: 12, mnemonics: MONTH_MNEMONICS },
  // 7 is accepted as Sunday, like Vixie cron and cronie.
  dow: { name: 'dow', min: 0, max: 7, mnemonics: STD_DOW_MNEMONICS },
});

export const QUARTZ_META: Readonly<Record<QuartzField, FieldMeta>> = Object.freeze({
  seconds: { name: 'seconds', min: 0, max: 59 },
  minute: { name: 'minute', min: 0, max: 59 },
  hour: { name: 'hour', min: 0, max: 23 },
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

const STANDARD_FIELDS: ReadonlyArray<FieldMeta> = [
  STANDARD_META.minute,
  STANDARD_META.hour,
  STANDARD_META.dom,
  STANDARD_META.month,
  STANDARD_META.dow,
];

const QUARTZ_FIELDS: ReadonlyArray<FieldMeta> = [
  QUARTZ_META.seconds,
  QUARTZ_META.minute,
  QUARTZ_META.hour,
  QUARTZ_META.dom,
  QUARTZ_META.month,
  QUARTZ_META.dow,
  QUARTZ_META.year,
];

/** Field metadata in source order, or `null` when the dialect does not
 *  accept `count` fields. */
export function fieldsFor(
  dialect: ResolvedCronMode,
  count: number,
): ReadonlyArray<FieldMeta> | null {
  if (dialect === 'standard') return count === 5 ? STANDARD_FIELDS : null;
  return count === 6 || count === 7 ? QUARTZ_FIELDS.slice(0, count) : null;
}
