import { deepFreeze } from '../ast/freeze.js';
import type { FieldAst } from '../ast/nodes.js';
import type { ResolvedCronMode, SourcePosition } from '../ast/dialect.js';
import type { ValidationError } from './errors.js';
import { checkValueInRange } from '../validator/rules/value-range.js';
import { checkQuartzOnlyFeature } from '../validator/rules/quartz-only-features.js';
import type { FieldMeta } from './field-meta.js';

type Result =
  | { readonly ok: true; readonly ast: FieldAst }
  | { readonly ok: false; readonly errors: ReadonlyArray<ValidationError> };

const NL_PATTERN = /^(\d{1,2})L$/u;
const NW_PATTERN = /^(\d{1,2})W$/u;
const NHASH_PATTERN = /^(\d{1,2})#([1-5])$/u;

/**
 * Try to recognise a Quartz-only field extension. Returns the parsed AST
 * (or an error result) when the lexeme matches one of:
 *
 *   - `?`        (Any)
 *   - `L`        (LastDom, offset 0)
 *   - `L-n`      (LastDom, offset n)
 *   - `<n>L`     (LastDow, weekday n)
 *   - `<n>W`     (WeekdayNearest, day n)
 *   - `<n>#<m>`  (NthDow, weekday n, nth m)
 *
 * Returns `null` if the lexeme does not match a Quartz extension -
 * the caller continues with standard-mode parsing (range, step, value).
 *
 * If the lexeme syntactically matches a Quartz extension but the dialect
 * is `standard`, returns an error result (do NOT silently fall through).
 */
export function parseQuartzExtension(
  lexeme: string,
  position: SourcePosition,
  meta: FieldMeta,
  dialect: ResolvedCronMode,
): Result | null {
  // 1. Bare '?' - Any
  if (lexeme === '?') {
    const e = checkQuartzOnlyFeature('?', dialect, meta.name, position);
    if (e !== null) return failure(e);
    if (meta.allowAny !== true) {
      return failure({
        field: meta.name,
        position,
        code: 'any-not-allowed-here',
        message: `'?' is not allowed in ${meta.name}; only in day-of-month or day-of-week`,
        suggestion: null,
      });
    }
    return ok(deepFreeze({ kind: 'any' } as FieldAst));
  }

  // 2. LastDom - `L` or `L-n`
  if (lexeme === 'L' || lexeme.startsWith('L-')) {
    const e = checkQuartzOnlyFeature('L', dialect, meta.name, position);
    if (e !== null) return failure(e);
    if (meta.allowLastDom !== true) {
      return failure({
        field: meta.name,
        position,
        code: 'last-dom-not-allowed-here',
        message: `'L' (last day of month) is only valid in day-of-month`,
        suggestion: null,
      });
    }
    let offset = 0;
    if (lexeme !== 'L') {
      const offStr = lexeme.slice(2);
      if (!/^\d+$/u.test(offStr)) {
        return failure({
          field: meta.name,
          position,
          code: 'invalid-last-dom-offset',
          message: `Invalid offset in '${lexeme}'`,
          suggestion: 'Use "L" or "L-N" where N is a positive integer',
        });
      }
      offset = Number.parseInt(offStr, 10);
      if (offset < 1 || offset > 30) {
        return failure({
          field: meta.name,
          position,
          code: 'last-dom-offset-out-of-range',
          message: `Offset ${offset} out of range for 'L-N' (1–30)`,
          suggestion: null,
        });
      }
    }
    return ok(deepFreeze({ kind: 'lastDom', offset } as FieldAst));
  }

  // 3. LastDow - `<n>L`
  const nl = NL_PATTERN.exec(lexeme);
  if (nl !== null) {
    const e = checkQuartzOnlyFeature('L', dialect, meta.name, position);
    if (e !== null) return failure(e);
    if (meta.allowLastDow !== true) {
      return failure({
        field: meta.name,
        position,
        code: 'last-dow-not-allowed-here',
        message: `'<n>L' (last <weekday> of month) is only valid in day-of-week`,
        suggestion: null,
      });
    }
    const weekday = Number.parseInt(nl[1] as string, 10);
    const rangeErr = checkValueInRange(weekday, meta, position);
    if (rangeErr !== null) return failure(rangeErr);
    return ok(deepFreeze({ kind: 'lastDow', weekday } as FieldAst));
  }

  // 4. WeekdayNearest - `<n>W`
  const nw = NW_PATTERN.exec(lexeme);
  if (nw !== null) {
    const e = checkQuartzOnlyFeature('W', dialect, meta.name, position);
    if (e !== null) return failure(e);
    if (meta.allowWeekdayNearest !== true) {
      return failure({
        field: meta.name,
        position,
        code: 'weekday-nearest-not-allowed-here',
        message: `'<n>W' (weekday nearest to N) is only valid in day-of-month`,
        suggestion: null,
      });
    }
    const day = Number.parseInt(nw[1] as string, 10);
    const rangeErr = checkValueInRange(day, meta, position);
    if (rangeErr !== null) return failure(rangeErr);
    return ok(deepFreeze({ kind: 'weekdayNearest', day } as FieldAst));
  }

  // 5. NthDow - `<n>#<m>`
  const nh = NHASH_PATTERN.exec(lexeme);
  if (nh !== null) {
    const e = checkQuartzOnlyFeature('#', dialect, meta.name, position);
    if (e !== null) return failure(e);
    if (meta.allowNthDow !== true) {
      return failure({
        field: meta.name,
        position,
        code: 'nth-dow-not-allowed-here',
        message: `'<n>#<m>' (nth weekday of month) is only valid in day-of-week`,
        suggestion: null,
      });
    }
    const weekday = Number.parseInt(nh[1] as string, 10);
    const nth = Number.parseInt(nh[2] as string, 10) as 1 | 2 | 3 | 4 | 5;
    const rangeErr = checkValueInRange(weekday, meta, position);
    if (rangeErr !== null) return failure(rangeErr);
    return ok(deepFreeze({ kind: 'nthDow', weekday, nth } as FieldAst));
  }

  return null;
}

function ok(ast: FieldAst): Result {
  return { ok: true, ast };
}

function failure(err: ValidationError): Result {
  return { ok: false, errors: Object.freeze([err]) };
}
