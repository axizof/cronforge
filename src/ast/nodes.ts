import { deepFreeze } from './freeze.js';
import type { MacroName, ResolvedCronMode } from './dialect.js';

/**
 * Per-field AST - discriminated union by `kind`. Every variant is
 * deeply immutable when produced by `makeCronExpression()` or by a
 * properly-written constructor helper that calls `deepFreeze`.
 */
export type FieldAst =
  | { readonly kind: 'wildcard' }
  | { readonly kind: 'any' }
  | { readonly kind: 'value'; readonly value: number }
  | { readonly kind: 'range'; readonly from: number; readonly to: number }
  | { readonly kind: 'step'; readonly base: FieldAst; readonly step: number }
  | { readonly kind: 'list'; readonly members: ReadonlyArray<FieldAst> }
  | { readonly kind: 'lastDom'; readonly offset: number }
  | { readonly kind: 'lastDow'; readonly weekday: number }
  | { readonly kind: 'weekdayNearest'; readonly day: number }
  | {
      readonly kind: 'nthDow';
      readonly weekday: number;
      readonly nth: 1 | 2 | 3 | 4 | 5;
    };

/** Per-field AST set covering both dialects. `seconds` and `year` are
 *  populated only for Quartz expressions. */
export interface FieldSet {
  readonly seconds?: FieldAst;
  readonly minute: FieldAst;
  readonly hour: FieldAst;
  readonly dom: FieldAst;
  readonly month: FieldAst;
  readonly dow: FieldAst;
  readonly year?: FieldAst;
}

/**
 * The parsed, immutable representation of a cron expression. Returned by
 * `parse()`, the `ok` branch of `tryParse()`, and produced internally by
 * `build()`.
 */
export interface CronExpression {
  readonly source: string;
  readonly dialect: ResolvedCronMode;
  readonly fields: FieldSet;
  readonly macro: MacroName | null;
  readonly hasReboot: boolean;
}

/** Parameters accepted by `makeCronExpression`. */
export interface MakeCronExpressionInput {
  readonly source: string;
  readonly dialect: ResolvedCronMode;
  readonly fields: FieldSet;
  readonly macro?: MacroName | null;
  readonly hasReboot?: boolean;
}

/**
 * Construct a deeply-frozen `CronExpression`. This is the single point at
 * which AST values escape into public return surfaces - calling
 * `deepFreeze` here is what satisfies Constitution Principle II at
 * runtime.
 *
 * @example
 * ```ts
 * const expr = makeCronExpression({
 *   source: '* * * * *',
 *   dialect: 'standard',
 *   fields: {
 *     minute: { kind: 'wildcard' },
 *     hour:   { kind: 'wildcard' },
 *     dom:    { kind: 'wildcard' },
 *     month:  { kind: 'wildcard' },
 *     dow:    { kind: 'wildcard' },
 *   },
 * });
 * Object.isFrozen(expr);         // true
 * Object.isFrozen(expr.fields);  // true
 * ```
 */
export function makeCronExpression(input: MakeCronExpressionInput): CronExpression {
  const expr: CronExpression = {
    source: input.source,
    dialect: input.dialect,
    fields: input.fields,
    macro: input.macro ?? null,
    hasReboot: input.hasReboot ?? false,
  };
  return deepFreeze(expr);
}

/** Convenience: build a frozen `Wildcard` node. */
export function wildcardField(): FieldAst {
  return deepFreeze({ kind: 'wildcard' } as const);
}

/** Convenience: build a frozen `Any` (Quartz `?`) node. */
export function anyField(): FieldAst {
  return deepFreeze({ kind: 'any' } as const);
}
