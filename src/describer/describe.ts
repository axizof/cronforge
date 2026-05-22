import { parse } from '../parser/parse.js';
import type { CronMode } from '../ast/dialect.js';
import type { CronExpression } from '../ast/nodes.js';
import { localeRegistry } from './locales/index.js';
import type { Locale } from './locales/index.js';
import { enLocale } from './locales/en.js';
import { frLocale } from './locales/fr.js';
import { esLocale } from './locales/es.js';
import { deLocale } from './locales/de.js';
import { itLocale } from './locales/it.js';
import { renderTime } from './render/time.js';
import { renderDay } from './render/day.js';
import { renderMonth } from './render/month.js';
import { renderYear } from './render/year.js';

// Eagerly register the v0.1.0 built-in locales the first time this
// module is loaded.  Ordering matters: `'en'` MUST be present before any
// describe() call so the fallback path can resolve.
let initialised = false;
function ensureBuiltinLocales(): void {
  if (initialised) return;
  initialised = true;
  localeRegistry.register('en', enLocale);
  localeRegistry.register('fr', frLocale);
  localeRegistry.register('es', esLocale);
  localeRegistry.register('de', deLocale);
  localeRegistry.register('it', itLocale);
}

/** Options accepted by `describe()`. */
export interface DescribeOptions {
  readonly mode: CronMode;
  readonly locale: Locale;
  /** Invoked when the requested locale is not registered and the
   *  describer falls back to `'en'` (FR-014). */
  readonly onFallback?: (requested: Locale, used: Locale) => void;
}

/**
 * Render a human-readable description of a cron expression in the chosen
 * locale.
 *
 * Accepts either a raw cron string (parsed internally with the given
 * mode) or a pre-parsed `CronExpression`. Falls back to English when the
 * requested locale is not registered; the fallback is observable via
 * `options.onFallback`.
 *
 * @example
 * ```ts
 * import { describe } from 'cronforge';
 *
 * describe('* * * 6-8 *', { mode: 'standard', locale: 'en' });
 * // -> 'Every minute, June through August'
 *
 * describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'fr' });
 * // -> 'À 12h00, uniquement le lundi'
 * ```
 */
export function describe(
  input: string | CronExpression,
  options: DescribeOptions,
): string {
  ensureBuiltinLocales();

  const expr: CronExpression =
    typeof input === 'string' ? parse(input, { mode: options.mode }) : input;

  // Locale resolution + fallback notification.
  const resolved = localeRegistry.resolve(options.locale);
  if (resolved.fellBack && options.onFallback !== undefined) {
    options.onFallback(options.locale, resolved.used);
  }
  const locale = resolved.data;

  // Macro shortcuts.
  if (expr.macro !== null && locale.phrases !== undefined) {
    const phrase = locale.phrases[expr.macro];
    if (phrase !== undefined) return phrase;
  }

  // Compose the four canonical fragments.
  const timePart = renderTime(expr.fields, locale);
  const monthIsWildcard = expr.fields.month.kind === 'wildcard';
  const dayPart = renderDay(expr.fields, expr.dialect, monthIsWildcard, locale);
  const monthPart = renderMonth(expr.fields.month, locale);
  const yearPart = renderYear(expr.fields.year, locale);

  let out = timePart;
  if (dayPart !== null) {
    out += dayPart.leadingComma ? `, ${dayPart.phrase}` : ` ${dayPart.phrase}`;
  }
  if (monthPart !== null) out += `, ${monthPart}`;
  if (yearPart !== null) out += `, ${yearPart}`;
  return out;
}
