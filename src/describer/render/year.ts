import { interpolate } from './interpolate.js';
import type { FieldAst } from '../../ast/nodes.js';
import type { LocaleData } from '../locales/index.js';

export function renderYear(node: FieldAst | undefined, locale: LocaleData): string | null {
  if (node === undefined || node.kind === 'wildcard') return null;
  if (node.kind === 'value') {
    return interpolate(locale.atoms['in_year']!, { year: String(node.value) });
  }
  if (node.kind === 'range') {
    return interpolate(locale.atoms['in_year']!, { year: `${node.from}-${node.to}` });
  }
  return null;
}
