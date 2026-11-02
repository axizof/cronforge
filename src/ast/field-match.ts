import type { FieldAst } from '../ast/nodes.js';

export interface FieldBounds {
  readonly min: number;
  readonly max: number;
}

/** Scalar match used by every field. Quartz day extensions (L, W, #) are
 *  handled in `day-match.ts` and never match here. */
export function matches(ast: FieldAst, value: number, bounds: FieldBounds): boolean {
  switch (ast.kind) {
    case 'wildcard':
    case 'any':
      return true;
    case 'value':
      return ast.value === value;
    case 'range':
      return value >= ast.from && value <= ast.to;
    case 'step':
      return matchesStep(ast.base, ast.step, value, bounds);
    case 'list':
      return ast.members.some((m) => matches(m, value, bounds));
    default:
      return false;
  }
}

// `*/N` starts at the field minimum (`*/2` on day-of-month is 1,3,5…) and
// Quartz `V/N` runs from V to the field maximum.
function matchesStep(base: FieldAst, step: number, value: number, bounds: FieldBounds): boolean {
  let from = bounds.min;
  let to = bounds.max;
  if (base.kind === 'range') {
    from = base.from;
    to = base.to;
  } else if (base.kind === 'value') {
    from = base.value;
  }
  return value >= from && value <= to && (value - from) % step === 0;
}

/** Smallest matching value in `[from, bounds.max]`, or `null`. */
export function nextMatch(ast: FieldAst, from: number, bounds: FieldBounds): number | null {
  for (let v = Math.max(from, bounds.min); v <= bounds.max; v++) {
    if (matches(ast, v, bounds)) return v;
  }
  return null;
}
