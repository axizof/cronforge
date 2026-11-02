import { parse } from '../parser/parse.js';
import type { CronMode } from '../ast/dialect.js';
import type { CronExpression } from '../ast/nodes.js';
import { EN, resolveLocale } from './locales/index.js';
import type { Locale } from './locales/index.js';
import { renderTime } from './render/time.js';
import { renderDay } from './render/day.js';
import { renderMonth, renderYear } from './render/calendar.js';
import { phrase } from './render/text.js';

export interface DescribeOptions {
  readonly mode: CronMode;
  readonly locale: Locale;
  /** Called when `locale` is not registered and English is used instead. */
  readonly onFallback?: (requested: Locale, used: Locale) => void;
}

/**
 * Describe a cron expression in natural language. Accepts a cron string or a
 * `CronExpression` returned by `parse()`. Falls back to English when the
 * requested locale is not registered.
 *
 * @throws {CronError} when given an invalid cron string.
 *
 * @example
 * ```ts
 * import { describe } from 'cronforge';
 *
 * describe('*\/10 9-17 * * 1-5', { mode: 'standard', locale: 'en' });
 * // 'Every 10 minutes, between 9:00 AM and 5:59 PM, from Monday through Friday'
 *
 * describe('0 30 8 ? * MON', { mode: 'quartz', locale: 'fr' });
 * // 'À 08h30, uniquement le lundi'
 * ```
 */
export function describe(input: string | CronExpression, options: DescribeOptions): string {
  const expr = typeof input === 'string' ? parse(input, { mode: options.mode }) : input;

  const { data: locale, used } = resolveLocale(options.locale);
  if (used !== options.locale) options.onFallback?.(options.locale, used);

  if (expr.macro !== null) {
    const macroPhrase = locale.phrases?.[expr.macro] ?? EN.phrases?.[expr.macro];
    if (macroPhrase !== undefined) return macroPhrase;
  }

  const time = renderTime(expr.fields, locale);
  const day = renderDay(expr.fields, expr.dialect, locale);
  const month = renderMonth(expr.fields.month, locale);
  const year = renderYear(expr.fields.year, locale);

  const parts = [time.text];
  if (day !== null) parts.push(day);
  else if (time.isFixedTime && month === null && year === null) {
    parts.push(phrase(locale, 'every_day'));
  }
  if (month !== null) parts.push(month);
  if (year !== null) parts.push(year);

  const text = parts.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
