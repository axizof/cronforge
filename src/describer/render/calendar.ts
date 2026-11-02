import { QUARTZ_META, STANDARD_META } from '../../parser/field-meta.js';
import type { FieldAst } from '../../ast/nodes.js';
import type { LocaleData } from '../locales/index.js';
import { expand, shapeOf } from './shape.js';
import { listValues, monthName, phrase, toRuns } from './text.js';

export function renderMonth(ast: FieldAst, locale: LocaleData): string | null {
  const months = expand(ast, STANDARD_META.month);
  if (months.length === 12) return null;

  const name = (m: number): string => monthName(m, locale);
  const runs = toRuns(months);
  const [single] = runs;
  if (runs.length === 1 && single !== undefined && single.to - single.from >= 2) {
    return phrase(locale, 'during_months_range', { from: name(single.from), to: name(single.to) });
  }
  return phrase(locale, 'in_months', { months: listValues(months, name, locale) });
}

export function renderYear(ast: FieldAst | undefined, locale: LocaleData): string | null {
  if (ast === undefined) return null;
  const bounds = QUARTZ_META.year;
  const shape = shapeOf(ast, bounds);
  if (shape.kind === 'all') return null;

  // An open-ended step ("2026/2") would list every year up to 2199.
  if (shape.kind === 'every' && shape.to === bounds.max) {
    const every = phrase(locale, 'every_x_years', { count: String(shape.step) });
    if (shape.full) return shape.step === 1 ? null : every;
    return `${every}, ${phrase(locale, 'starting_in_year', { year: String(shape.from) })}`;
  }
  return phrase(locale, 'in_year', { year: listValues(expand(ast, bounds), String, locale) });
}
