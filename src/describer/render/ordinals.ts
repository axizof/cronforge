import type { LocaleData } from '../locales/index.js';

/**
 * Resolve an English-style ordinal suffix for an integer using the
 * locale's `ordinals` lookup table. Falls back to `'default'`.
 *
 * - en: `1 -> 'st'`, `2 -> 'nd'`, `3 -> 'rd'`, `4..20 -> 'th'`, `21 -> 'st'`, etc.
 * - fr: `1 -> 'er'`, all others -> `''`.
 */
export function ordinalSuffix(n: number, locale: LocaleData): string {
  const key = String(n);
  if (Object.prototype.hasOwnProperty.call(locale.ordinals, key)) {
    return locale.ordinals[key] ?? '';
  }
  return locale.ordinals['default'] ?? '';
}

/** Localised label for "1st", "2nd", "3rd", "4th", "5th" used by nth-weekday rendering. */
export function nthLabel(n: 1 | 2 | 3 | 4 | 5, locale: LocaleData): string {
  const keys: Record<number, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' };
  const key = keys[n];
  if (key === undefined) return String(n);
  return locale.ordinals[key] ?? String(n);
}
