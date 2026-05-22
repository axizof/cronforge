import { deepFreeze } from '../ast/freeze.js';
import { anyField, makeCronExpression, wildcardField } from '../ast/nodes.js';
import type { FieldAst, FieldSet } from '../ast/nodes.js';
import type { ResolvedCronMode } from '../ast/dialect.js';
import { parse } from '../parser/parse.js';
import { ParseError } from '../parser/errors.js';
import { ok, err } from '../result/result.js';
import type { Result } from '../result/result.js';
import { serialize } from '../serializer/serialize.js';
import { resolveMonth, resolveWeekday, validateInput } from './input.js';
import type { CronBuilderInput, TimeOfDay } from './input.js';
import { makeBuildError } from './errors.js';
import type { BuildError } from './errors.js';

export interface BuildOptions {
  readonly mode: ResolvedCronMode;
}

/**
 * Build a cron string from a structured input. Throws `ParseError`
 * wrapping a `BuildError` on invalid input. Use `buildResult()` for the
 * never-throws variant.
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
  throw new ParseError({
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
  if (options.mode !== 'standard' && options.mode !== 'quartz') {
    return err(
      makeBuildError({
        code: 'invalid-mode',
        message: `build() requires mode: 'standard' | 'quartz' (got '${String(options.mode)}')`,
      }),
    );
  }

  const validationErr = validateInput(input, options.mode);
  if (validationErr !== null) return err(validationErr);

  let fields: FieldSet;
  try {
    fields = buildFieldSet(input, options.mode);
  } catch (e) {
    return err(
      makeBuildError({
        code: 'internal-error',
        message: `Internal builder error: ${e instanceof Error ? e.message : String(e)}`,
      }),
    );
  }

  const expr = makeCronExpression({
    source: '',
    dialect: options.mode,
    fields,
    macro: null,
    hasReboot: false,
  });
  const str = serialize(expr);

  try {
    parse(str, { mode: options.mode });
  } catch (e) {
    if (e instanceof ParseError) {
      return err(
        makeBuildError({
          code: 'roundtrip-failed',
          message: `Builder produced '${str}' but it does not re-parse: ${e.message}`,
        }),
      );
    }
    throw e;
  }
  return ok(str);
}

function buildFieldSet(input: CronBuilderInput, mode: ResolvedCronMode): FieldSet {
  switch (input.kind) {
    case 'everyN': return everyNFields(input, mode);
    case 'at': return atFields(input, mode);
    case 'daysOfWeek': return daysOfWeekFields(input, mode);
    case 'daysOfMonth': return daysOfMonthFields(input, mode);
    case 'hourRange': return hourRangeFields(input, mode);
    case 'monthRange': return monthRangeFields(input, mode);
    case 'nthWeekdayOfMonth': return nthWeekdayOfMonthFields(input, mode);
    case 'lastDayOfMonth': return lastDayOfMonthFields(input, mode);
    case 'lastWeekdayOfMonth': return lastWeekdayOfMonthFields(input, mode);
    case 'weekdayNearestTo': return weekdayNearestToFields(input, mode);
    case 'composite':
      return mergeComposite(input.parts.map((p) => buildFieldSet(p, mode)), mode);
  }
}

function everyNFields(
  input: Extract<CronBuilderInput, { kind: 'everyN' }>,
  mode: ResolvedCronMode,
): FieldSet {
  const base = baseFields(mode);
  const stepNode = step(wildcardField(), input.n);
  switch (input.unit) {
    case 'minute':
      return overlay(base, { minute: stepNode });
    case 'hour':
      return overlay(base, { minute: value(0), hour: stepNode });
    case 'day':
      return overlay(base, {
        minute: value(0),
        hour: value(0),
        dom: stepNode,
        ...(mode === 'quartz' ? { dow: anyField() } : {}),
      });
    case 'month':
      return overlay(base, {
        minute: value(0),
        hour: value(0),
        dom: value(1),
        month: stepNode,
        ...(mode === 'quartz' ? { dow: anyField() } : {}),
      });
    case 'year': {
      // `year` only exists in 7-field Quartz; otherwise fall back to month-N.
      const next = overlay(base, {
        minute: value(0),
        hour: value(0),
        dom: value(1),
        month: value(1),
        ...(mode === 'quartz' ? { dow: anyField() } : {}),
      });
      if (mode === 'quartz') return { ...next, year: stepNode };
      return next;
    }
  }
}

function atFields(
  input: Extract<CronBuilderInput, { kind: 'at' }>,
  mode: ResolvedCronMode,
): FieldSet {
  const base = baseFields(mode);
  const minuteAst = list(input.times.map((t) => value(t.minute)));
  const hourAst = list(input.times.map((t) => value(t.hour)));
  const out = overlay(base, { minute: minuteAst, hour: hourAst });
  if (mode === 'quartz') {
    const secondAst = list(input.times.map((t) => value(t.second ?? 0)));
    return overlay(out, { seconds: secondAst, dom: anyField() });
  }
  return out;
}

function daysOfWeekFields(
  input: Extract<CronBuilderInput, { kind: 'daysOfWeek' }>,
  mode: ResolvedCronMode,
): FieldSet {
  const dows = list(input.days.map((d) => value(resolveWeekday(d, mode))));
  return overlay(baseFields(mode), {
    ...timeOfDayOverlay(input.at, mode),
    dow: dows,
    ...(mode === 'quartz' ? { dom: anyField() } : {}),
  });
}

function daysOfMonthFields(
  input: Extract<CronBuilderInput, { kind: 'daysOfMonth' }>,
  mode: ResolvedCronMode,
): FieldSet {
  const doms = list(input.days.map((d) => value(d)));
  return overlay(baseFields(mode), {
    ...timeOfDayOverlay(input.at, mode),
    dom: doms,
    ...(mode === 'quartz' ? { dow: anyField() } : {}),
  });
}

function hourRangeFields(
  input: Extract<CronBuilderInput, { kind: 'hourRange' }>,
  mode: ResolvedCronMode,
): FieldSet {
  return overlay(baseFields(mode), {
    minute: value(input.minute ?? 0),
    hour: range(input.from, input.to),
    ...(mode === 'quartz' ? { dom: anyField() } : {}),
  });
}

function monthRangeFields(
  input: Extract<CronBuilderInput, { kind: 'monthRange' }>,
  mode: ResolvedCronMode,
): FieldSet {
  const monthAst = range(resolveMonth(input.from), resolveMonth(input.to));
  return overlay(baseFields(mode), {
    month: monthAst,
    ...(input.at !== undefined ? timeOfDayOverlay(input.at, mode) : {}),
    ...(mode === 'quartz' && input.at !== undefined ? { dom: anyField() } : {}),
  });
}

function nthWeekdayOfMonthFields(
  input: Extract<CronBuilderInput, { kind: 'nthWeekdayOfMonth' }>,
  mode: ResolvedCronMode,
): FieldSet {
  return overlay(baseFields(mode), {
    ...timeOfDayOverlay(input.at, mode),
    dom: anyField(),
    dow: deepFreeze({
      kind: 'nthDow',
      weekday: resolveWeekday(input.weekday, mode),
      nth: input.nth,
    } as FieldAst),
  });
}

function lastDayOfMonthFields(
  input: Extract<CronBuilderInput, { kind: 'lastDayOfMonth' }>,
  mode: ResolvedCronMode,
): FieldSet {
  return overlay(baseFields(mode), {
    ...timeOfDayOverlay(input.at, mode),
    dom: deepFreeze({ kind: 'lastDom', offset: 0 } as FieldAst),
    dow: anyField(),
  });
}

function lastWeekdayOfMonthFields(
  input: Extract<CronBuilderInput, { kind: 'lastWeekdayOfMonth' }>,
  mode: ResolvedCronMode,
): FieldSet {
  return overlay(baseFields(mode), {
    ...timeOfDayOverlay(input.at, mode),
    dom: anyField(),
    dow: deepFreeze({
      kind: 'lastDow',
      weekday: resolveWeekday(input.weekday, mode),
    } as FieldAst),
  });
}

function weekdayNearestToFields(
  input: Extract<CronBuilderInput, { kind: 'weekdayNearestTo' }>,
  mode: ResolvedCronMode,
): FieldSet {
  return overlay(baseFields(mode), {
    ...timeOfDayOverlay(input.at, mode),
    dom: deepFreeze({ kind: 'weekdayNearest', day: input.day } as FieldAst),
    dow: anyField(),
  });
}

function mergeComposite(parts: ReadonlyArray<FieldSet>, mode: ResolvedCronMode): FieldSet {
  const out: Partial<FieldSet> = {};
  const fields: ReadonlyArray<keyof FieldSet> =
    mode === 'standard'
      ? ['minute', 'hour', 'dom', 'month', 'dow']
      : ['seconds', 'minute', 'hour', 'dom', 'month', 'dow', 'year'];
  for (const f of fields) {
    const nodes: FieldAst[] = [];
    for (const p of parts) {
      const n = p[f];
      if (n !== undefined && !nodes.some((x) => sameAst(x, n))) nodes.push(n);
    }
    if (nodes.length === 0) continue;
    (out as Record<string, FieldAst>)[f as string] = nodes.length === 1 ? nodes[0]! : list(nodes);
  }
  return out as FieldSet;
}

function baseFields(mode: ResolvedCronMode): FieldSet {
  const w = wildcardField();
  if (mode === 'standard') return { minute: w, hour: w, dom: w, month: w, dow: w };
  return { seconds: w, minute: w, hour: w, dom: w, month: w, dow: w };
}

function overlay(base: FieldSet, patch: Partial<FieldSet>): FieldSet {
  return { ...base, ...patch };
}

function timeOfDayOverlay(t: TimeOfDay, mode: ResolvedCronMode): Partial<FieldSet> {
  const minute = value(t.minute);
  const hour = value(t.hour);
  if (mode === 'quartz') return { seconds: value(t.second ?? 0), minute, hour };
  return { minute, hour };
}

function value(n: number): FieldAst {
  return deepFreeze({ kind: 'value', value: n } as FieldAst);
}

function range(from: number, to: number): FieldAst {
  return deepFreeze({ kind: 'range', from, to } as FieldAst);
}

function step(base: FieldAst, n: number): FieldAst {
  return deepFreeze({ kind: 'step', base, step: n } as FieldAst);
}

function list(members: ReadonlyArray<FieldAst>): FieldAst {
  if (members.length === 1) return members[0]!;
  return deepFreeze({ kind: 'list', members: Object.freeze([...members]) } as FieldAst);
}

function sameAst(a: FieldAst, b: FieldAst): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
