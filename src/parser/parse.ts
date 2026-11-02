import { detectDialect } from '../ast/dialect.js';
import type {
  CronMode,
  FieldName,
  MacroName,
  ResolvedCronMode,
  SourcePosition,
} from '../ast/dialect.js';
import { makeCronExpression, wildcardField } from '../ast/nodes.js';
import type { CronExpression, FieldAst, FieldSet } from '../ast/nodes.js';
import { CronError } from './errors.js';
import type { ValidationError } from './errors.js';
import { ok, err } from '../result/result.js';
import type { Result } from '../result/result.js';
import { tokenize } from '../tokenizer/tokenize.js';
import type { RawFieldToken, TokenizeResult } from '../tokenizer/tokenize.js';
import { expandMacro } from './macros.js';
import { fieldsFor } from './field-meta.js';
import { parseField } from './field-parser.js';
import { fieldCountError } from '../validator/rules/field-count.js';
import { unknownMacroError } from '../validator/rules/unknown-macro.js';

export interface ParseOptions {
  readonly mode: CronMode;
}

/**
 * Parse a cron expression into an immutable `CronExpression`.
 *
 * @example
 * ```ts
 * import { parse } from 'cronforge';
 *
 * parse('* * * 6-8 *', { mode: 'standard' });
 * // CronExpression { dialect: 'standard', fields: { month: { kind: 'range', from: 6, to: 8 }, ... } }
 * ```
 *
 * @throws {CronError} when the expression is invalid.
 */
export function parse(expression: string, options: ParseOptions): CronExpression {
  const result = parseInternal(expression, options);
  if (result.ok) return result.value;
  throw result.error;
}

/**
 * Parse a cron expression and return a `Result`. Never throws.
 *
 * @example
 * ```ts
 * import { tryParse } from 'cronforge';
 *
 * const r = tryParse('not a cron', { mode: 'standard' });
 * if (!r.ok) console.error(r.error.errors[0].message);
 * ```
 */
export function tryParse(
  expression: string,
  options: ParseOptions,
): Result<CronExpression, CronError> {
  try {
    return parseInternal(expression, options);
  } catch (e) {
    return err(wrapUnexpected(expression, e));
  }
}

function parseInternal(
  expression: string,
  options: ParseOptions,
): Result<CronExpression, CronError> {
  if (typeof expression !== 'string') {
    return err(
      new CronError({
        message: 'Expression must be a string',
        code: 'not-a-string',
        errors: [
          {
            field: 'whole',
            position: { start: 0, end: 0 },
            code: 'not-a-string',
            message: 'parse() expects a string argument',
            suggestion: null,
          },
        ],
        source: String(expression ?? ''),
      }),
    );
  }

  const tokens: TokenizeResult = tokenize(expression);

  if (tokens.kind === 'empty') {
    return err(
      makeCronError(expression, 'empty-input', 'Expression is empty', [
        {
          field: 'whole',
          position: { start: 0, end: expression.length },
          code: 'empty-input',
          message: 'Cron expression is empty',
          suggestion: null,
        },
      ]),
    );
  }

  if (tokens.kind === 'unknown-macro') {
    const ve = unknownMacroError(tokens.lexeme, tokens.position);
    return err(makeCronError(expression, ve.code, ve.message, [ve]));
  }

  if (tokens.kind === 'macro') {
    return parseFromMacro(expression, tokens.macro, tokens.position, options.mode);
  }

  return parseFromFields(expression, tokens.fields, options.mode);
}

function parseFromMacro(
  source: string,
  macro: MacroName,
  position: SourcePosition,
  mode: CronMode,
): Result<CronExpression, CronError> {
  if (mode === 'quartz') {
    const ve: ValidationError = {
      field: 'whole',
      position,
      code: 'macro-in-quartz',
      message: `Macro '${macro}' is a standard-mode shorthand; not valid in Quartz mode`,
      suggestion: "Use mode: 'standard' or 'auto', or write the expression out explicitly",
    };
    return err(makeCronError(source, ve.code, ve.message, [ve]));
  }
  const fields = expandMacro(macro);
  if (fields === null) {
    return ok(
      makeCronExpression({
        source,
        dialect: 'standard',
        fields: rebootFields(),
        macro,
        hasReboot: true,
      }),
    );
  }
  return ok(makeCronExpression({ source, dialect: 'standard', fields, macro, hasReboot: false }));
}

function parseFromFields(
  source: string,
  rawTokens: ReadonlyArray<RawFieldToken>,
  mode: CronMode,
): Result<CronExpression, CronError> {
  const wholePos: SourcePosition = { start: 0, end: source.length };

  const dialect = resolveDialect(mode, rawTokens);
  if (dialect === null) {
    const ve: ValidationError = {
      field: 'whole',
      position: wholePos,
      code: 'auto-detect-failed',
      message: `Cannot auto-detect dialect from ${rawTokens.length} field(s); be explicit (mode: 'standard' | 'quartz')`,
      suggestion: null,
    };
    return err(makeCronError(source, ve.code, ve.message, [ve]));
  }

  const metas = fieldsFor(dialect, rawTokens.length);
  if (metas === null) {
    const ve = fieldCountError(dialect, rawTokens.length, wholePos);
    return err(makeCronError(source, ve.code, ve.message, [ve]));
  }

  const errors: ValidationError[] = [];
  const built: Partial<Record<FieldName, FieldAst>> = {};
  for (const [i, meta] of metas.entries()) {
    const raw = rawTokens[i] as RawFieldToken;
    const r = parseField(raw.lexeme, raw.position, meta, dialect);
    if (r.ok) built[meta.name] = r.ast;
    else errors.push(...r.errors);
  }

  if (errors.length > 0) {
    const primary = errors[0] as ValidationError;
    return err(makeCronError(source, primary.code, primary.message, errors));
  }

  const fields: FieldSet =
    dialect === 'standard'
      ? {
          minute: built.minute as FieldAst,
          hour: built.hour as FieldAst,
          dom: built.dom as FieldAst,
          month: built.month as FieldAst,
          dow: built.dow as FieldAst,
        }
      : assembleQuartzFieldSet(built);

  return ok(makeCronExpression({ source, dialect, fields, macro: null, hasReboot: false }));
}

function assembleQuartzFieldSet(built: Partial<Record<FieldName, FieldAst>>): FieldSet {
  const base = {
    seconds: built.seconds as FieldAst,
    minute: built.minute as FieldAst,
    hour: built.hour as FieldAst,
    dom: built.dom as FieldAst,
    month: built.month as FieldAst,
    dow: built.dow as FieldAst,
  };
  if (built.year !== undefined) return { ...base, year: built.year };
  return base;
}

function resolveDialect(
  mode: CronMode,
  rawTokens: ReadonlyArray<RawFieldToken>,
): ResolvedCronMode | null {
  if (mode === 'standard' || mode === 'quartz') return mode;
  return detectDialect(rawTokens.map((t) => t.lexeme));
}

function rebootFields(): FieldSet {
  const w = wildcardField();
  return { minute: w, hour: w, dom: w, month: w, dow: w };
}

function makeCronError(
  source: string,
  code: string,
  message: string,
  errors: ReadonlyArray<ValidationError>,
): CronError {
  return new CronError({ message, code, errors, source });
}

function wrapUnexpected(source: string, e: unknown): CronError {
  if (e instanceof CronError) return e;
  const message = e instanceof Error ? e.message : String(e);
  return new CronError({
    message: `Unexpected error during parse: ${message}`,
    code: 'internal-error',
    errors: [
      {
        field: 'whole',
        position: { start: 0, end: source.length },
        code: 'internal-error',
        message: `Internal parser error: ${message}`,
        suggestion: 'Please report this as a bug at https://github.com/axizof/cronforge/issues',
      },
    ],
    source,
  });
}
