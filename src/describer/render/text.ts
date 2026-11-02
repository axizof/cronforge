import { EN } from '../locales/index.js';
import type { LocaleData } from '../locales/index.js';

/** Locale atom with `{{name}}` placeholders filled in. Falls back to English
 *  for atoms a custom locale does not define. */
export function phrase(
  locale: LocaleData,
  key: string,
  params: Readonly<Record<string, string>> = {},
): string {
  const template = locale.atoms[key] ?? EN.atoms[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/gu, (match, name: string) => params[name] ?? match);
}

/** `a`, `a and b`, `a, b and c`. */
export function joinList(items: ReadonlyArray<string>, locale: LocaleData): string {
  if (items.length <= 1) return items.join('');
  const head = items.slice(0, -1).join(', ');
  return `${head} ${phrase(locale, 'and')} ${items.slice(-1).join('')}`;
}

/** Sorted values as a list, with runs of 3+ consecutive values collapsed:
 *  `[1, 2, 3, 5]` → `1 through 3 and 5`. */
export function listValues(
  values: ReadonlyArray<number>,
  format: (n: number) => string,
  locale: LocaleData,
): string {
  const items = toRuns(values).flatMap(({ from, to }) => {
    if (to - from >= 2) return [phrase(locale, 'range', { from: format(from), to: format(to) })];
    return from === to ? [format(from)] : [format(from), format(to)];
  });
  return joinList(items, locale);
}

export function toRuns(values: ReadonlyArray<number>): Array<{ from: number; to: number }> {
  const runs: Array<{ from: number; to: number }> = [];
  for (const v of values) {
    const last = runs[runs.length - 1];
    if (last !== undefined && v === last.to + 1) last.to = v;
    else runs.push({ from: v, to: v });
  }
  return runs;
}

export function ordinal(n: number, locale: LocaleData): string {
  return `${n}${locale.ordinals[String(n)] ?? locale.ordinals['default'] ?? ''}`;
}

const NTH_KEYS = ['first', 'second', 'third', 'fourth', 'fifth'] as const;

export function nthLabel(nth: 1 | 2 | 3 | 4 | 5, locale: LocaleData): string {
  return locale.ordinals[NTH_KEYS[nth - 1] ?? 'first'] ?? String(nth);
}

/** 0 = Sunday. */
export function weekdayName(n: number, locale: LocaleData): string {
  const key = String(n);
  return locale.weekdays[key] ?? EN.weekdays[key] ?? key;
}

export function monthName(n: number, locale: LocaleData): string {
  const key = String(n);
  return locale.months[key] ?? EN.months[key] ?? key;
}

export function formatTime(
  hour: number,
  minute: number,
  second: number,
  locale: LocaleData,
): string {
  const sep = locale.meta.timeSeparator ?? ':';
  const secondsPart = second === 0 ? '' : `:${pad2(second)}`;
  if (locale.meta.timeFormat === '24h') {
    return `${pad2(hour)}${sep}${pad2(minute)}${secondsPart}`;
  }
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${sep}${pad2(minute)}${secondsPart} ${hour < 12 ? 'AM' : 'PM'}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
