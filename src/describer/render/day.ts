import { QUARTZ_META, STANDARD_META } from '../../parser/field-meta.js';
import { startsWithStar } from '../../iterator/day-match.js';
import type { FieldAst, FieldSet } from '../../ast/nodes.js';
import type { ResolvedCronMode } from '../../ast/dialect.js';
import type { LocaleData } from '../locales/index.js';
import { expand, shapeOf } from './shape.js';
import { listValues, nthLabel, ordinal, phrase, toRuns, weekdayName } from './text.js';

/** Day-of-month + day-of-week clause, or `null` when every day matches. */
export function renderDay(
  fields: FieldSet,
  dialect: ResolvedCronMode,
  locale: LocaleData,
): string | null {
  const dom = describeDom(fields.dom, locale);
  if (dom === null) return describeDow(fields.dow, dialect, locale, true);

  // Standard cron fires when either field matches (see day-match.ts).
  const either =
    dialect === 'standard' && !startsWithStar(fields.dom) && !startsWithStar(fields.dow);
  const dow = describeDow(fields.dow, dialect, locale, !either);
  if (dow === null) return dom;
  return either ? `${dom} ${phrase(locale, 'or')} ${dow}` : `${dom}, ${dow}`;
}

function describeDom(ast: FieldAst, locale: LocaleData): string | null {
  switch (ast.kind) {
    case 'lastDom':
      return ast.offset === 0
        ? phrase(locale, 'last_day_of_month')
        : phrase(locale, 'last_day_offset', { offset: String(ast.offset) });
    case 'lastWeekday':
      return phrase(locale, 'last_business_day_of_month');
    case 'weekdayNearest':
      return phrase(locale, 'weekday_nearest_to', { day: ordinal(ast.day, locale) });
    default:
      break;
  }

  const bounds = STANDARD_META.dom;
  const shape = shapeOf(ast, bounds);
  if (shape.kind === 'all') return null;
  if (shape.kind === 'every' && shape.full) {
    return shape.step === 1 ? null : phrase(locale, 'every_x_days', { count: String(shape.step) });
  }

  const days = expand(ast, bounds);
  const [only] = days;
  if (days.length === 1 && only !== undefined) {
    return phrase(locale, 'on_day_of_month', { day: ordinal(only, locale) });
  }
  return phrase(locale, 'on_days_of_month', {
    days: listValues(days, (d) => ordinal(d, locale), locale),
  });
}

function describeDow(
  ast: FieldAst,
  dialect: ResolvedCronMode,
  locale: LocaleData,
  standalone: boolean,
): string | null {
  // `nL` and `n#m` are Quartz-only, where SUN = 1.
  switch (ast.kind) {
    case 'lastDow':
      return phrase(locale, 'last_weekday_of_month', {
        weekday: weekdayName(ast.weekday - 1, locale),
      });
    case 'nthDow':
      return phrase(locale, 'nth_weekday_of_month', {
        nth: nthLabel(ast.nth, locale),
        weekday: weekdayName(ast.weekday - 1, locale),
      });
    default:
      break;
  }

  const bounds = dialect === 'quartz' ? QUARTZ_META.dow : STANDARD_META.dow;
  const sundayZero = expand(ast, bounds).map((d) => (dialect === 'quartz' ? d - 1 : d % 7));
  const days = [...new Set(sundayZero)].sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return null;

  const name = (d: number): string => weekdayName(d, locale);
  const runs = toRuns(days);
  const [single] = runs;
  if (runs.length === 1 && single !== undefined) {
    if (single.from === single.to && standalone) {
      return phrase(locale, 'only_on_weekday', { weekday: name(single.from) });
    }
    if (single.to - single.from >= 2) {
      return phrase(locale, 'from_to_weekday', { from: name(single.from), to: name(single.to) });
    }
  }
  return phrase(locale, 'on_weekdays', { weekdays: listValues(days, name, locale) });
}
