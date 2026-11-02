import { deepFreeze } from './freeze.js';
import type { MacroName, ResolvedCronMode } from './dialect.js';

/** Per-field AST — discriminated union by `kind`. */
export type FieldAst =
  | { readonly kind: 'wildcard' }
  | { readonly kind: 'any' }
  | { readonly kind: 'value'; readonly value: number }
  | { readonly kind: 'range'; readonly from: number; readonly to: number }
  | { readonly kind: 'step'; readonly base: FieldAst; readonly step: number }
  | { readonly kind: 'list'; readonly members: ReadonlyArray<FieldAst> }
  | { readonly kind: 'lastDom'; readonly offset: number }
  /** Quartz `LW`: last Monday–Friday of the month. */
  | { readonly kind: 'lastWeekday' }
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

/** Parsed, immutable representation of a cron expression. */
export interface CronExpression {
  readonly source: string;
  readonly dialect: ResolvedCronMode;
  readonly fields: FieldSet;
  readonly macro: MacroName | null;
  readonly hasReboot: boolean;
}

interface MakeCronExpressionInput {
  readonly source: string;
  readonly dialect: ResolvedCronMode;
  readonly fields: FieldSet;
  readonly macro?: MacroName | null;
  readonly hasReboot?: boolean;
}

/** Construct a deeply-frozen `CronExpression`. Single escape point for AST
 *  values into public return surfaces. */
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

export function wildcardField(): FieldAst {
  return deepFreeze({ kind: 'wildcard' } as const);
}
