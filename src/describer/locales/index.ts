import { deepFreeze } from '../../ast/freeze.js';
import en from './en.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };
import de from './de.json' with { type: 'json' };
import it from './it.json' with { type: 'json' };

/** Locale code. `(string & Record<never, never>)` accepts any string while
 *  keeping autocomplete on the built-ins. */
export type Locale = 'en' | 'fr' | 'es' | 'de' | 'it' | (string & Record<never, never>);

/** `'12h'` → `9:30 AM`; `'24h'` → `09:30`. */
export type TimeFormat = '12h' | '24h';

/** Hour/minute separator: `':'` → `12:00`; `'h'` → `12h00` (French). */
export type TimeSeparator = ':' | 'h';

/**
 * Locale bundle, same shape as the JSON files published under
 * `cronforge/locales/<code>.json`. Missing `atoms`, `months`, `weekdays` and
 * `phrases` entries fall back to English, so a custom locale can start small.
 */
export interface LocaleData {
  readonly meta: {
    readonly code: string;
    readonly name: string;
    readonly timeFormat: TimeFormat;
    readonly timeSeparator?: TimeSeparator;
  };
  readonly atoms: Readonly<Record<string, string>>;
  readonly months: Readonly<Record<string, string>>;
  readonly weekdays: Readonly<Record<string, string>>;
  readonly ordinals: Readonly<Record<string, string>>;
  readonly phrases?: Readonly<Record<string, string>>;
}

export const EN = en as LocaleData;
const FALLBACK: Locale = 'en';

const bundles = new Map<string, LocaleData>([
  ['en', EN],
  ['fr', fr as LocaleData],
  ['es', es as LocaleData],
  ['de', de as LocaleData],
  ['it', it as LocaleData],
]);

export function setLocale(code: string, data: LocaleData): void {
  // Copy first: freezing the caller's own object would be a surprising side effect.
  const copy = JSON.parse(JSON.stringify(data)) as LocaleData;
  bundles.set(code, deepFreeze(copy));
}

export function resolveLocale(requested: Locale): {
  readonly data: LocaleData;
  readonly used: Locale;
} {
  const data = bundles.get(requested);
  return data === undefined ? { data: EN, used: FALLBACK } : { data, used: requested };
}
