import type { FieldAst, FieldSet } from '../ast/nodes.js';
import type { ResolvedCronMode } from '../ast/dialect.js';
import { CronError } from '../parser/errors.js';
import { ok, err } from '../result/result.js';
import type { Result } from '../result/result.js';
import { serializeFieldSet } from '../serializer/serialize.js';
import { validate } from '../validator/validate.js';
import { resolveMonth, resolveWeekday, validateInput } from './input.js';
import type { CronBuilderInput, TimeOfDay } from './input.js';
import { makeBuildError } from './errors.js';
import type { BuildError } from './errors.js';

export interface BuildOptions {
  readonly mode: ResolvedCronMode;
}

/**
 * Build a cron string from a structured input.
 *
 * @throws {CronError} carrying the `BuildError` code when the input is
 * invalid. Use `buildResult()` for the never-throws variant.
 *
 * @example
 * ```ts
 * import { build } from 'cronforge';
 *
 * build(
 *   { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } },
 *   { mode: 'standard' },
 * );
 * // '0 9 * * 1,3,5'
 * ```
 */
export function build(input: CronBuilderInput, options: BuildOptions): string {
  const r = buildResult(input, options);
  if (r.ok) return r.value;
  throw new CronError({
    message: r.error.message,
    code: r.error.code,
    errors: [
      {
        field: r.error.field ?? null,
        position: { start: 0, end: 0 },
        code: r.error.code,
        message: r.error.message,
        suggestion: null,
      },
    ],
    source: '',
  });
}

/**
 * Result-style variant of `build()`. Never throws.
 *
 * @example
 * ```ts
 * import { buildResult } from 'cronforge';
 *
 * const r = buildResult(
 *   { kind: 'lastDayOfMonth', at: { hour: 23, minute: 59 } },
 *   { mode: 'standard' },
 * );
 * if (!r.ok) console.error(r.error.code); // 'mode-incompatibility'
 * ```
 */
export function buildResult(
  input: CronBuilderInput,
  options: BuildOptions,
): Result<string, BuildError> {
  const { mode } = options;
  if (mode !== 'standard' && mode !== 'quartz') {
    return err(
      makeBuildError({
        code: 'invalid-mode',
        message: `build() requires mode: 'standard' | 'quartz' (got '${String(mode)}')`,
      }),
    );
  }

  const inputError = validateInput(input, mode);
  if (inputError !== null) return err(inputError);

  const expression = serializeFieldSet(buildFieldSet(input, mode), mode);
  // A builder bug must surface as an error, never as a silently wrong schedule.
  const check = validate(expression, { mode });
  if (!check.valid) {
    return err(
      makeBuildError({
        code: 'internal-error',
        message: `Builder produced an invalid expression '${expression}': ${check.errors[0]?.message ?? ''}`,
      }),
    );
  }
  return ok(expression);
}

function buildFieldSet(input: CronBuilderInput, mode: ResolvedCronMode): FieldSet {
  const base: FieldSet =
    mode === 'standard'
      ? { minute: WILDCARD, hour: WILDCARD, dom: WILDCARD, month: WILDCARD, dow: WILDCARD }
      : {
          seconds: value(0),
          minute: WILDCARD,
          hour: WILDCARD,
          dom: WILDCARD,
          month: WILDCARD,
          dow: ANY,
        };

  switch (input.kind) {
    case 'everyN':
      return everyN(base, input.unit, input.n);
    case 'at':
      return {
        ...base,
        hour: values(input.times.map((t) => t.hour)),
        minute: values(input.times.map((t) => t.minute)),
        ...(mode === 'quartz' ? { seconds: values(input.times.map((t) => t.second ?? 0)) } : {}),
      };
    case 'daysOfWeek':
      return {
        ...base,
        ...timeOfDay(input.at, mode),
        ...onDow(values(input.days.map((d) => resolveWeekday(d, mode))), mode),
      };
    case 'daysOfMonth':
      return { ...base, ...timeOfDay(input.at, mode), dom: values(input.days) };
    case 'hourRange':
      return { ...base, minute: value(input.minute ?? 0), hour: range(input.from, input.to) };
    case 'monthRange':
      return {
        ...base,
        ...(input.at === undefined ? {} : timeOfDay(input.at, mode)),
        month: range(resolveMonth(input.from), resolveMonth(input.to)),
      };
    case 'nthWeekdayOfMonth':
      return {
        ...base,
        ...timeOfDay(input.at, mode),
        ...onDow(
          { kind: 'nthDow', weekday: resolveWeekday(input.weekday, mode), nth: input.nth },
          mode,
        ),
      };
    case 'lastDayOfMonth':
      return { ...base, ...timeOfDay(input.at, mode), dom: { kind: 'lastDom', offset: 0 } };
    case 'lastWeekdayOfMonth':
      return {
        ...base,
        ...timeOfDay(input.at, mode),
        ...onDow({ kind: 'lastDow', weekday: resolveWeekday(input.weekday, mode) }, mode),
      };
    case 'weekdayNearestTo':
      return {
        ...base,
        ...timeOfDay(input.at, mode),
        dom: { kind: 'weekdayNearest', day: input.day },
      };
  }
}

function everyN(
  base: FieldSet,
  unit: Extract<CronBuilderInput, { kind: 'everyN' }>['unit'],
  n: number,
): FieldSet {
  const every: FieldAst = { kind: 'step', base: WILDCARD, step: n };
  const midnight = { minute: value(0), hour: value(0) };
  switch (unit) {
    case 'minute':
      return { ...base, minute: every };
    case 'hour':
      return { ...base, minute: value(0), hour: every };
    case 'day':
      return { ...base, ...midnight, dom: every };
    case 'month':
      return { ...base, ...midnight, dom: value(1), month: every };
    case 'year':
      // n > 1 is rejected in standard mode, so the year field is Quartz-only here.
      return {
        ...base,
        ...midnight,
        dom: value(1),
        month: value(1),
        ...(n > 1 ? { year: every } : {}),
      };
  }
}

// Quartz needs `?` in day-of-month as soon as day-of-week is set.
function onDow(dow: FieldAst, mode: ResolvedCronMode): Partial<FieldSet> {
  return mode === 'quartz' ? { dom: ANY, dow } : { dow };
}

function timeOfDay(t: TimeOfDay, mode: ResolvedCronMode): Partial<FieldSet> {
  const time = { minute: value(t.minute), hour: value(t.hour) };
  return mode === 'quartz' ? { ...time, seconds: value(t.second ?? 0) } : time;
}

const WILDCARD: FieldAst = { kind: 'wildcard' };
const ANY: FieldAst = { kind: 'any' };

function value(n: number): FieldAst {
  return { kind: 'value', value: n };
}

function range(from: number, to: number): FieldAst {
  return { kind: 'range', from, to };
}

function values(ns: ReadonlyArray<number>): FieldAst {
  const members = [...new Set(ns)].sort((a, b) => a - b).map(value);
  const [only, ...rest] = members;
  return only !== undefined && rest.length === 0 ? only : { kind: 'list', members };
}
