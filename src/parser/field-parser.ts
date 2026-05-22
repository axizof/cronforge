import { deepFreeze } from '../ast/freeze.js';
import type { FieldAst } from '../ast/nodes.js';
import type { ResolvedCronMode, SourcePosition } from '../ast/dialect.js';
import type { ValidationError } from './errors.js';
import { checkValueInRange, checkRangeBounds } from '../validator/rules/value-range.js';
import { checkStep } from '../validator/rules/step-base.js';
import { checkQuartzOnlyFeature } from '../validator/rules/quartz-only-features.js';
import type { FieldMeta } from './field-meta.js';
import { parseQuartzExtension } from './field-parser-quartz.js';

export type FieldParseResult =
  | { readonly ok: true; readonly ast: FieldAst }
  | { readonly ok: false; readonly errors: ReadonlyArray<ValidationError> };

export function parseField(
  lexeme: string,
  position: SourcePosition,
  meta: FieldMeta,
  dialect: ResolvedCronMode,
): FieldParseResult {
  if (lexeme.length === 0) {
    return failure({
      field: meta.name,
      position,
      code: 'empty-field',
      message: `Empty field in ${meta.name}`,
      suggestion: null,
    });
  }
  if (lexeme.includes(',')) return parseList(lexeme, position, meta, dialect);
  return parseSub(lexeme, position, meta, dialect);
}

function parseList(
  lexeme: string,
  position: SourcePosition,
  meta: FieldMeta,
  dialect: ResolvedCronMode,
): FieldParseResult {
  const parts = lexeme.split(',');
  const members: FieldAst[] = [];
  const errors: ValidationError[] = [];
  for (const part of parts) {
    if (part.length === 0) {
      errors.push({
        field: meta.name,
        position,
        code: 'empty-list-member',
        message: `Empty list member in ${meta.name}`,
        suggestion: null,
      });
      continue;
    }
    const r = parseSub(part, position, meta, dialect);
    if (r.ok) {
      if (r.ast.kind === 'list') {
        errors.push({
          field: meta.name,
          position,
          code: 'nested-list',
          message: `Nested list inside list in ${meta.name}`,
          suggestion: null,
        });
      } else {
        members.push(r.ast);
      }
    } else {
      errors.push(...r.errors);
    }
  }
  if (errors.length > 0) return { ok: false, errors: Object.freeze(errors) };
  return {
    ok: true,
    ast: deepFreeze({ kind: 'list', members: Object.freeze(members) } as FieldAst),
  };
}

function parseSub(
  lexeme: string,
  position: SourcePosition,
  meta: FieldMeta,
  dialect: ResolvedCronMode,
): FieldParseResult {
  if (lexeme === '*') {
    return { ok: true, ast: deepFreeze({ kind: 'wildcard' } as FieldAst) };
  }

  const slashIdx = lexeme.indexOf('/');
  if (slashIdx >= 0) return parseStep(lexeme, slashIdx, position, meta, dialect);

  const quartzResult = parseQuartzExtension(lexeme, position, meta, dialect);
  if (quartzResult !== null) return quartzResult;

  const dashIdx = findRangeDash(lexeme);
  if (dashIdx > 0) return parseRange(lexeme, dashIdx, position, meta);

  return parseValue(lexeme, position, meta);
}

function parseStep(
  lexeme: string,
  slashIdx: number,
  position: SourcePosition,
  meta: FieldMeta,
  _dialect: ResolvedCronMode,
): FieldParseResult {
  const baseStr = lexeme.slice(0, slashIdx);
  const stepStr = lexeme.slice(slashIdx + 1);
  const step = parseIntStrict(stepStr);

  let baseKind: 'wildcard' | 'range' | 'value' | 'other' = 'other';
  let baseAst: FieldAst | null = null;
  let baseErrors: ReadonlyArray<ValidationError> = [];

  if (baseStr === '*') {
    baseKind = 'wildcard';
    baseAst = deepFreeze({ kind: 'wildcard' } as FieldAst);
  } else if (findRangeDash(baseStr) > 0) {
    const r = parseRange(baseStr, findRangeDash(baseStr), position, meta);
    if (r.ok) {
      baseKind = 'range';
      baseAst = r.ast;
    } else {
      baseErrors = r.errors;
    }
  } else {
    const r = parseValue(baseStr, position, meta);
    if (r.ok) {
      baseKind = 'value';
      baseAst = r.ast;
    } else {
      baseErrors = r.errors;
    }
  }

  const errors: ValidationError[] = [...baseErrors];
  if (step === null) {
    errors.push({
      field: meta.name,
      position,
      code: 'step-not-positive',
      message: `Step '${stepStr}' must be a positive integer in ${meta.name}`,
      suggestion: null,
    });
  } else {
    const stepErr = checkStep(baseKind, step, meta.name, position);
    if (stepErr !== null) errors.push(stepErr);
  }

  if (errors.length > 0 || baseAst === null || step === null) {
    return { ok: false, errors: Object.freeze(errors) };
  }
  return {
    ok: true,
    ast: deepFreeze({ kind: 'step', base: baseAst, step } as FieldAst),
  };
}

function parseRange(
  lexeme: string,
  dashIdx: number,
  position: SourcePosition,
  meta: FieldMeta,
): FieldParseResult {
  const fromStr = lexeme.slice(0, dashIdx);
  const toStr = lexeme.slice(dashIdx + 1);
  const fromResolved = resolveLiteral(fromStr, meta);
  const toResolved = resolveLiteral(toStr, meta);
  const errors: ValidationError[] = [];

  if (fromResolved === null) errors.push(literalError(fromStr, meta, position));
  else {
    const e = checkValueInRange(fromResolved, meta, position);
    if (e !== null) errors.push(e);
  }
  if (toResolved === null) errors.push(literalError(toStr, meta, position));
  else {
    const e = checkValueInRange(toResolved, meta, position);
    if (e !== null) errors.push(e);
  }
  if (fromResolved !== null && toResolved !== null) {
    const e = checkRangeBounds(fromResolved, toResolved, meta, position);
    if (e !== null) errors.push(e);
  }
  if (errors.length > 0) return { ok: false, errors: Object.freeze(errors) };
  return {
    ok: true,
    ast: deepFreeze({
      kind: 'range',
      from: fromResolved as number,
      to: toResolved as number,
    } as FieldAst),
  };
}

function parseValue(
  lexeme: string,
  position: SourcePosition,
  meta: FieldMeta,
): FieldParseResult {
  if (lexeme === '?') {
    return failure(
      checkQuartzOnlyFeature('?', 'standard', meta.name, position) ?? {
        field: meta.name,
        position,
        code: 'unsupported-token',
        message: `'?' is not valid in ${meta.name}`,
        suggestion: null,
      },
    );
  }
  const n = resolveLiteral(lexeme, meta);
  if (n === null) return failure(literalError(lexeme, meta, position));
  const rangeErr = checkValueInRange(n, meta, position);
  if (rangeErr !== null) return failure(rangeErr);
  return { ok: true, ast: deepFreeze({ kind: 'value', value: n } as FieldAst) };
}

/** First `-` past position 0, so `L-3` reads as one literal. -1 when absent. */
function findRangeDash(lexeme: string): number {
  for (let i = 1; i < lexeme.length; i++) {
    if (lexeme.charAt(i) === '-') return i;
  }
  return -1;
}

function parseIntStrict(s: string): number | null {
  if (!/^\d+$/u.test(s)) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function resolveLiteral(lexeme: string, meta: FieldMeta): number | null {
  if (/^\d+$/u.test(lexeme)) return Number.parseInt(lexeme, 10);
  if (meta.mnemonics !== undefined) {
    const m = meta.mnemonics[lexeme.toUpperCase()];
    return m ?? null;
  }
  return null;
}

function literalError(
  lexeme: string,
  meta: FieldMeta,
  position: SourcePosition,
): ValidationError {
  const hint =
    meta.mnemonics !== undefined
      ? `Allowed: ${meta.min}–${meta.max} or ${Object.keys(meta.mnemonics).join(', ')}`
      : `Allowed: ${meta.min}–${meta.max}`;
  return {
    field: meta.name,
    position,
    code: 'invalid-literal',
    message: `Cannot interpret '${lexeme}' in ${meta.name}`,
    suggestion: hint,
  };
}

function failure(err: ValidationError): FieldParseResult {
  return { ok: false, errors: Object.freeze([err]) };
}
