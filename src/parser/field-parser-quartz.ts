import { deepFreeze } from '../ast/freeze.js';
import type { FieldAst } from '../ast/nodes.js';
import type { ResolvedCronMode, SourcePosition } from '../ast/dialect.js';
import type { ValidationError } from './errors.js';
import { checkValueInRange } from '../validator/rules/value-range.js';
import { checkQuartzOnlyFeature } from '../validator/rules/quartz-only-features.js';
import type { FieldMeta } from './field-meta.js';
import type { FieldParseResult } from './field-parser.js';

const NL_PATTERN = /^(\d{1,2})L$/u;
const NW_PATTERN = /^(\d{1,2})W$/u;
const NHASH_PATTERN = /^(\d{1,2})#([1-5])$/u;

/** Recognise `?`, `L`, `L-n`, `nL`, `nW`, `n#m`. Returns `null` when the
 *  lexeme does not match any Quartz extension. */
export function parseQuartzExtension(
  lexeme: string,
  position: SourcePosition,
  meta: FieldMeta,
  dialect: ResolvedCronMode,
): FieldParseResult | null {
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

  // In day-of-week, a bare `L` is Quartz shorthand for Saturday (7).
  if (lexeme === 'L' && meta.allowLastDow === true) {
    return ok(deepFreeze({ kind: 'value', value: 7 } as FieldAst));
  }

  if (lexeme === 'LW') {
    const e = checkQuartzOnlyFeature('W', dialect, meta.name, position);
    if (e !== null) return failure(e);
    if (meta.allowLastDom !== true) {
      return failure({
        field: meta.name,
        position,
        code: 'last-weekday-not-allowed-here',
        message: `'LW' (last weekday of month) is only valid in day-of-month`,
        suggestion: null,
      });
    }
    return ok(deepFreeze({ kind: 'lastWeekday' } as FieldAst));
  }

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
    const weekday = Number(nl[1]);
    const rangeErr = checkValueInRange(weekday, meta, position);
    if (rangeErr !== null) return failure(rangeErr);
    return ok(deepFreeze({ kind: 'lastDow', weekday } as FieldAst));
  }

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
    const day = Number(nw[1]);
    const rangeErr = checkValueInRange(day, meta, position);
    if (rangeErr !== null) return failure(rangeErr);
    return ok(deepFreeze({ kind: 'weekdayNearest', day } as FieldAst));
  }

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
    const weekday = Number(nh[1]);
    const nth = Number(nh[2]) as 1 | 2 | 3 | 4 | 5;
    const rangeErr = checkValueInRange(weekday, meta, position);
    if (rangeErr !== null) return failure(rangeErr);
    return ok(deepFreeze({ kind: 'nthDow', weekday, nth } as FieldAst));
  }

  return null;
}

function ok(ast: FieldAst): FieldParseResult {
  return { ok: true, ast };
}

function failure(err: ValidationError): FieldParseResult {
  return { ok: false, errors: Object.freeze([err]) };
}
