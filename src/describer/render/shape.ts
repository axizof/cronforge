import { matches } from '../../ast/field-match.js';
import type { FieldBounds } from '../../ast/field-match.js';
import type { FieldAst } from '../../ast/nodes.js';

/** What a field matches, in the form the renderers phrase it. */
export type Shape =
  | { readonly kind: 'all' }
  | { readonly kind: 'values'; readonly values: ReadonlyArray<number> }
  | {
      readonly kind: 'every';
      readonly step: number;
      readonly from: number;
      readonly to: number;
      /** The step covers the whole field (`*\/N`, or `0/N` in Quartz). */
      readonly full: boolean;
    };

export function shapeOf(ast: FieldAst, bounds: FieldBounds): Shape {
  if (ast.kind === 'wildcard' || ast.kind === 'any') return { kind: 'all' };
  if (ast.kind === 'step') {
    let from = bounds.min;
    let to = bounds.max;
    if (ast.base.kind === 'range') {
      from = ast.base.from;
      to = ast.base.to;
    } else if (ast.base.kind === 'value') {
      from = ast.base.value;
    }
    const full = from === bounds.min && to === bounds.max;
    return { kind: 'every', step: ast.step, from, to, full };
  }
  return { kind: 'values', values: expand(ast, bounds) };
}

/** Every value of the field the AST matches, ascending. */
export function expand(ast: FieldAst, bounds: FieldBounds): ReadonlyArray<number> {
  const values: number[] = [];
  for (let v = bounds.min; v <= bounds.max; v++) {
    if (matches(ast, v, bounds)) values.push(v);
  }
  return values;
}
