import type { FieldAst } from '../ast/nodes.js';

/** Scalar match used by minute/hour/month/year/second and simple dom/dow.
 *  Quartz day extensions (L, W, #) are handled in `day-match.ts`. */
export function matches(ast: FieldAst, value: number): boolean {
  switch (ast.kind) {
    case 'wildcard':
    case 'any':
      return true;
    case 'value':
      return ast.value === value;
    case 'range':
      return value >= ast.from && value <= ast.to;
    case 'step':
      return matchesStep(ast.base, ast.step, value);
    case 'list':
      for (const m of ast.members) if (matches(m, value)) return true;
      return false;
    case 'lastDom':
    case 'lastDow':
    case 'weekdayNearest':
    case 'nthDow':
      return false;
    default:
      return false;
  }
}

function matchesStep(base: FieldAst, step: number, value: number): boolean {
  if (base.kind === 'wildcard') return value % step === 0;
  if (base.kind === 'range') {
    if (value < base.from || value > base.to) return false;
    return (value - base.from) % step === 0;
  }
  return false;
}

/** Smallest matching `value` in `[max(from, min), max]`, or `null`. */
export function nextMatch(
  ast: FieldAst,
  from: number,
  min: number,
  max: number,
): number | null {
  const start = Math.max(from, min);
  for (let v = start; v <= max; v++) {
    if (matches(ast, v)) return v;
  }
  return null;
}
