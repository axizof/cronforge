import { localeRegistry } from './locales/index.js';
import type { LocaleData } from './locales/index.js';

/**
 * Register a custom locale at runtime. Subsequent `describe()` calls
 * using `code` will resolve to `data`. Overwrites any previous
 * registration (built-in or custom) for the same `code`.
 *
 * The library deeply-freezes `data` on registration to prevent caller
 * mutation (Constitution Principle II).
 *
 * @example
 * ```ts
 * import { registerLocale, describe } from 'cronforge';
 *
 * registerLocale('jp', {
 *   meta: { code: 'jp', name: '日本語', version: '1.0.0', timeFormat: '24h' },
 *   atoms: {  ... },
 *   units: {  ... },
 *   months: { ... },
 *   weekdays: { ... },
 *   ordinals: { default: '' },
 * });
 *
 * describe('* * * * *', { mode: 'standard', locale: 'jp' });
 * ```
 */
export function registerLocale(code: string, data: LocaleData): void {
  localeRegistry.register(code, data);
}
