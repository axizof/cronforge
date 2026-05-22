import { interpolate } from './interpolate.js';
import { nthLabel, ordinalSuffix } from './ordinals.js';
import type { FieldAst, FieldSet } from '../../ast/nodes.js';
import type { LocaleData } from '../locales/index.js';
import type { ResolvedCronMode } from '../../ast/dialect.js';

/**
 * Output of `renderDay`: either nothing (the day-clause is irrelevant -
 * for example when month is restricted but dom/dow are wildcards) or a
 * phrase plus a flag indicating whether the joiner should prepend a
 * comma.
 */
export interface DayFragment {
  readonly phrase: string;
  readonly leadingComma: boolean;
}

/**
 * Render the day-related clause: weekday, day-of-month, last-day, nth-of,
 * etc.  Returns `null` to elide the clause entirely.
 */
export function renderDay(
  fields: FieldSet,
  dialect: ResolvedCronMode,
  monthIsWildcard: boolean,
  locale: LocaleData,
): DayFragment | null {
  const dom = fields.dom;
  const dow = fields.dow;

  // -------------------------------------------------------------------
  // Catch-all: both dom and dow are "everything" -> render "every day"
  // only when the month is unrestricted; otherwise let the month clause
  // carry the meaning ("Every minute, June through August").
  // -------------------------------------------------------------------
  const domIsEvery = dom.kind === 'wildcard' || dom.kind === 'any';
  const dowIsEvery = dow.kind === 'wildcard' || dow.kind === 'any';
  if (domIsEvery && dowIsEvery) {
    if (!monthIsWildcard) return null;
    return {
      phrase: locale.atoms['every_day']!,
      // Quartz uses "?" semantics - match the spec example exactly:
      //   "At 12:00 PM every day" (no comma)
      // Standard cron joins with a comma:
      //   "At 11:00 AM, every day"
      leadingComma: dialect === 'standard',
    };
  }

  // -------------------------------------------------------------------
  // Concrete dow first (more user-friendly than dom in most cases).
  // -------------------------------------------------------------------
  if (!dowIsEvery) {
    const dowPhrase = renderDowNode(dow, dialect, locale);
    if (dowPhrase !== null) return { phrase: dowPhrase, leadingComma: true };
  }

  // -------------------------------------------------------------------
  // Otherwise render dom.
  // -------------------------------------------------------------------
  if (!domIsEvery) {
    const domPhrase = renderDomNode(dom, locale);
    if (domPhrase !== null) return { phrase: domPhrase, leadingComma: true };
  }

  return null;
}

function renderDowNode(
  node: FieldAst,
  dialect: ResolvedCronMode,
  locale: LocaleData,
): string | null {
  switch (node.kind) {
    case 'value':
      return interpolate(locale.atoms['only_on_weekday']!, {
        weekday: weekdayName(node.value, dialect, locale),
      });
    case 'range':
      return interpolate(locale.atoms['from_to_weekday']!, {
        from: weekdayName(node.from, dialect, locale),
        to: weekdayName(node.to, dialect, locale),
      });
    case 'list': {
      const names = node.members.map((m) =>
        m.kind === 'value' ? weekdayName(m.value, dialect, locale) : '?',
      );
      return interpolate(locale.atoms['on_weekdays']!, {
        weekdays: joinList(names),
      });
    }
    case 'lastDow':
      return interpolate(locale.atoms['last_weekday_of_month']!, {
        weekday: weekdayName(node.weekday, dialect, locale),
      });
    case 'nthDow':
      return interpolate(locale.atoms['nth_weekday_of_month']!, {
        nth: nthLabel(node.nth, locale),
        weekday: weekdayName(node.weekday, dialect, locale),
      });
    default:
      return null;
  }
}

function renderDomNode(node: FieldAst, locale: LocaleData): string | null {
  switch (node.kind) {
    case 'value':
      return interpolate(locale.atoms['on_day_of_month']!, {
        day: String(node.value),
        ord: ordinalSuffix(node.value, locale),
      });
    case 'list': {
      const days = node.members
        .filter((m): m is { readonly kind: 'value'; readonly value: number } => m.kind === 'value')
        .map((m) => `${m.value}${ordinalSuffix(m.value, locale)}`);
      return interpolate(locale.atoms['on_days_of_month']!, {
        days: joinList(days),
      });
    }
    case 'lastDom':
      if (node.offset === 0) return locale.atoms['last_day_of_month']!;
      return interpolate(locale.atoms['last_day_offset']!, {
        offset: String(node.offset),
        ord: ordinalSuffix(node.offset, locale),
      });
    case 'weekdayNearest':
      return interpolate(locale.atoms['weekday_nearest_to']!, {
        day: String(node.day),
        ord: ordinalSuffix(node.day, locale),
      });
    default:
      return null;
  }
}

/**
 * Convert a dialect-numbered weekday (`SUN=0..SAT=6` for standard,
 * `SUN=1..SAT=7` for Quartz) into the locale weekday name. Locale
 * `weekdays` keys use standard numbering (FR-013 design).
 */
function weekdayName(n: number, dialect: ResolvedCronMode, locale: LocaleData): string {
  const stdN = dialect === 'standard' ? n : ((n - 1) % 7 + 7) % 7;
  return locale.weekdays[String(stdN)] ?? String(n);
}

function joinList(items: ReadonlyArray<string>): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')}, ${items[items.length - 1]!}`;
}
