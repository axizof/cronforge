import type { FieldAst } from '../ast/nodes.js';

/**
 * True iff `value` matches the given field AST. Used by the iterator on
 * minute, hour, month, year, second, and dom/dow when no Quartz extras
 * are involved (those use `day-match.ts`).
 */
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
      for (const m of ast.members) {
        if (matches(m, value)) return true;
      }
      return false;
    // Quartz day extensions never match via this function - handled by
    // `day-match.ts`. Return false here as a defensive default.
    case 'lastDom':
    case 'lastDow':
    case 'weekdayNearest':
    case 'nthDow':
      return false;
    default:
      // Exhaustiveness check for unknown future variants.
      return false;
  }
}

function matchesStep(base: FieldAst, step: number, value: number): boolean {
  if (base.kind === 'wildcard') {
    return value % step === 0;
  }
  if (base.kind === 'range') {
    if (value < base.from || value > base.to) return false;
    return (value - base.from) % step === 0;
  }
  return false;
}

/**
 * Return the smallest `value >= from` (and `<= max`) that matches `ast`,
 * or `null` if none exists in the field's range.
 */
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
