import type { LocaleData } from '../locales/index.js';

export function ordinalSuffix(n: number, locale: LocaleData): string {
  const key = String(n);
  if (Object.prototype.hasOwnProperty.call(locale.ordinals, key)) {
    return locale.ordinals[key] ?? '';
  }
  return locale.ordinals['default'] ?? '';
}

export function nthLabel(n: 1 | 2 | 3 | 4 | 5, locale: LocaleData): string {
  const keys: Record<number, string> = {
    1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth',
  };
  const key = keys[n];
  if (key === undefined) return String(n);
  return locale.ordinals[key] ?? String(n);
}
