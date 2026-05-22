import { interpolate } from './interpolate.js';
import type { FieldAst } from '../../ast/nodes.js';
import type { LocaleData } from '../locales/index.js';

export function renderMonth(node: FieldAst, locale: LocaleData): string | null {
  switch (node.kind) {
    case 'wildcard':
      return null;
    case 'value':
      return interpolate(locale.atoms['in_months']!, {
        months: monthName(node.value, locale),
      });
    case 'range':
      return interpolate(locale.atoms['during_months_range']!, {
        from: monthName(node.from, locale),
        to: monthName(node.to, locale),
      });
    case 'list': {
      const names = node.members
        .filter((m): m is { readonly kind: 'value'; readonly value: number } => m.kind === 'value')
        .map((m) => monthName(m.value, locale));
      return interpolate(locale.atoms['in_months']!, { months: joinList(names) });
    }
    default:
      return null;
  }
}

function monthName(n: number, locale: LocaleData): string {
  return locale.months[String(n)] ?? String(n);
}

function joinList(items: ReadonlyArray<string>): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')}, ${items[items.length - 1]!}`;
}
