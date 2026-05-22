import { localeRegistry } from './locales/index.js';
import type { LocaleData } from './locales/index.js';

/**
 * Register a custom locale at runtime. Overwrites any previous registration
 * for the same `code`. The data is deeply frozen on registration.
 *
 * @example
 * ```ts
 * import { registerLocale, describe } from 'cronforge';
 *
 * registerLocale('jp', { meta: { code: 'jp', name: '日本語', version: '1.0.0', timeFormat: '24h' }, ... });
 * describe('* * * * *', { mode: 'standard', locale: 'jp' });
 * ```
 */
export function registerLocale(code: string, data: LocaleData): void {
  localeRegistry.register(code, data);
}
