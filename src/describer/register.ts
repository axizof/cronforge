import { setLocale } from './locales/index.js';
import type { LocaleData } from './locales/index.js';

/**
 * Register a locale at runtime, or replace a built-in one. The data is copied
 * and frozen. Keys missing from `data` fall back to English.
 *
 * @example
 * ```ts
 * import { registerLocale, describe } from 'cronforge';
 * import nl from './cronforge-nl.json';
 *
 * registerLocale('nl', nl);
 * describe('0 9 * * 1-5', { mode: 'standard', locale: 'nl' });
 * ```
 */
export function registerLocale(code: string, data: LocaleData): void {
  setLocale(code, data);
}
