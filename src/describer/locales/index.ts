import { deepFreeze } from '../../ast/freeze.js';

/** Locale code. `(string & Record<never, never>)` widens to any string while
 *  preserving autocomplete on the built-ins; ESLint forbids `& {}`. */
export type Locale =
  | 'en' | 'fr' | 'es' | 'de' | 'it'
  | (string & Record<never, never>);

/** `'12h'` clock with AM/PM; `'24h'` clock. */
export type TimeFormat = '12h' | '24h';

/** Hour/minute separator: `':'` → `12:00`; `'h'` → `12h00` (French). */
export type TimeSeparator = ':' | 'h';

export interface LocaleData {
  readonly meta: {
    readonly code: string;
    readonly name: string;
    readonly version: string;
    readonly timeFormat: TimeFormat;
    readonly timeSeparator?: TimeSeparator;
  };
  readonly atoms: Readonly<Record<string, string>>;
  readonly units: Readonly<Record<string, string>>;
  readonly months: Readonly<Record<string, string>>;
  readonly weekdays: Readonly<Record<string, string>>;
  readonly ordinals: Readonly<Record<string, string>>;
  readonly phrases?: Readonly<Record<string, string>>;
}

export interface ResolvedLocale {
  readonly used: Locale;
  readonly data: LocaleData;
  readonly fellBack: boolean;
}

const FALLBACK_LOCALE: Locale = 'en';

export class LocaleRegistry {
  private readonly bundles = new Map<string, LocaleData>();

  register(code: string, data: LocaleData): void {
    this.bundles.set(code, deepFreeze({ ...data }));
  }

  has(code: string): boolean {
    return this.bundles.has(code);
  }

  resolve(requested: Locale): ResolvedLocale {
    const direct = this.bundles.get(requested);
    if (direct !== undefined) return { used: requested, data: direct, fellBack: false };
    const fallback = this.bundles.get(FALLBACK_LOCALE);
    if (fallback === undefined) {
      throw new Error(
        `cronforge: no fallback locale '${FALLBACK_LOCALE}' is registered; this is a library bug`,
      );
    }
    return { used: FALLBACK_LOCALE, data: fallback, fellBack: true };
  }
}

export const localeRegistry = new LocaleRegistry();
