import type { CronExpression, FieldAst, FieldSet } from '../ast/nodes.js';
import type { ResolvedCronMode } from '../ast/dialect.js';

/**
 * Render a `CronExpression` back to its canonical string form. The
 * output, when fed back into `parse()` with the same mode, MUST produce
 * an AST semantically equivalent to the input (round-trip property -
 * tested in `test/integration/build-roundtrip.test.ts`).
 */
export function serialize(expr: CronExpression): string {
  if (expr.macro !== null && !expr.hasReboot) {
    // Macros round-trip as their original macro token.
    return expr.macro;
  }
  if (expr.hasReboot) return '@reboot';

  const f = expr.fields;
  if (expr.dialect === 'standard') {
    return [
      serializeField(f.minute, expr.dialect),
      serializeField(f.hour, expr.dialect),
      serializeField(f.dom, expr.dialect),
      serializeField(f.month, expr.dialect),
      serializeField(f.dow, expr.dialect),
    ].join(' ');
  }
  // Quartz
  const base = [
    serializeField(f.seconds as FieldAst, expr.dialect),
    serializeField(f.minute, expr.dialect),
    serializeField(f.hour, expr.dialect),
    serializeField(f.dom, expr.dialect),
    serializeField(f.month, expr.dialect),
    serializeField(f.dow, expr.dialect),
  ];
  if (f.year !== undefined) base.push(serializeField(f.year, expr.dialect));
  return base.join(' ');
}

/** Serialize a single `FieldSet` into its dialect-appropriate string. */
export function serializeFieldSet(fields: FieldSet, dialect: ResolvedCronMode): string {
  return serialize({
    source: '',
    dialect,
    fields,
    macro: null,
    hasReboot: false,
  });
}

function serializeField(ast: FieldAst, _dialect: ResolvedCronMode): string {
  switch (ast.kind) {
    case 'wildcard':
      return '*';
    case 'any':
      return '?';
    case 'value':
      return String(ast.value);
    case 'range':
      return `${ast.from}-${ast.to}`;
    case 'step':
      return `${serializeField(ast.base, _dialect)}/${ast.step}`;
    case 'list':
      return ast.members.map((m) => serializeField(m, _dialect)).join(',');
    case 'lastDom':
      return ast.offset === 0 ? 'L' : `L-${ast.offset}`;
    case 'lastDow':
      return `${ast.weekday}L`;
    case 'weekdayNearest':
      return `${ast.day}W`;
    case 'nthDow':
      return `${ast.weekday}#${ast.nth}`;
  }
}
