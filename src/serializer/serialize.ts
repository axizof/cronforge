import type { CronExpression, FieldAst, FieldSet } from '../ast/nodes.js';
import type { ResolvedCronMode } from '../ast/dialect.js';

/** `CronExpression` → cron string. Output round-trips through `parse()`. */
export function serialize(expr: CronExpression): string {
  if (expr.hasReboot) return '@reboot';
  if (expr.macro !== null) return expr.macro;

  const f = expr.fields;
  if (expr.dialect === 'standard') {
    return [f.minute, f.hour, f.dom, f.month, f.dow].map(serializeField).join(' ');
  }
  const base = [
    f.seconds as FieldAst,
    f.minute, f.hour, f.dom, f.month, f.dow,
  ].map(serializeField);
  if (f.year !== undefined) base.push(serializeField(f.year));
  return base.join(' ');
}

export function serializeFieldSet(fields: FieldSet, dialect: ResolvedCronMode): string {
  return serialize({ source: '', dialect, fields, macro: null, hasReboot: false });
}

function serializeField(ast: FieldAst): string {
  switch (ast.kind) {
    case 'wildcard': return '*';
    case 'any': return '?';
    case 'value': return String(ast.value);
    case 'range': return `${ast.from}-${ast.to}`;
    case 'step': return `${serializeField(ast.base)}/${ast.step}`;
    case 'list': return ast.members.map(serializeField).join(',');
    case 'lastDom': return ast.offset === 0 ? 'L' : `L-${ast.offset}`;
    case 'lastDow': return `${ast.weekday}L`;
    case 'weekdayNearest': return `${ast.day}W`;
    case 'nthDow': return `${ast.weekday}#${ast.nth}`;
  }
}
