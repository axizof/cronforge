import { deepFreeze } from '../../ast/freeze.js';

/**
 * Locale code. Built-in: `'en' | 'fr' | 'es' | 'de' | 'it'`. Any other
 * string is accepted at runtime once `registerLocale()` has been called
 * with that code.
 */
// The `(string & Record<never, never>)` branch widens the literal union to
// `string` without losing IDE autocomplete on the four built-in codes
// (well-known TypeScript pattern). `{}` is forbidden by the linter because
// it actually means "any non-nullish value" - `Record<never, never>` is
// equivalent in effect for this purpose but semantically explicit.
export type Locale =
  | 'en' | 'fr' | 'es' | 'de' | 'it'
  | (string & Record<never, never>);

/** Hour format selector. `'12h'` selects a 12-hour clock with AM/PM;
 *  `'24h'` selects a 24-hour clock. */
export type TimeFormat = '12h' | '24h';

/** Separator between hours and minutes in rendered time strings.
 *  `':'` produces `12:00`; `'h'` produces `12h00` (French convention). */
export type TimeSeparator = ':' | 'h';

/** Shape of one locale's data file (see contracts/locale-format.md). */
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

/**
 * Outcome of resolving a requested locale: the data that should actually
 * be used, plus a flag noting whether a fallback was applied. Returned by
 * `LocaleRegistry.resolve`; consumed by `describe()` to invoke
 * `options.onFallback` (FR-014).
 */
export interface ResolvedLocale {
  readonly used: Locale;
  readonly data: LocaleData;
  readonly fellBack: boolean;
}

const FALLBACK_LOCALE: Locale = 'en';

/**
 * Process-wide locale registry. Holds the built-in locale bundles (when
 * Phase 4 wires them in) and any consumer-registered locales. The
 * registry deeply-freezes every bundle on registration to prevent caller
 * mutation (Constitution Principle II).
 */
export class LocaleRegistry {
  private readonly bundles = new Map<string, LocaleData>();

  /** Register or override a locale bundle. */
  register(code: string, data: LocaleData): void {
    this.bundles.set(code, deepFreeze({ ...data }));
  }

  /** True iff a bundle exists for the given code. */
  has(code: string): boolean {
    return this.bundles.has(code);
  }

  /**
   * Resolve a requested locale to actual data. If the requested code is
   * not registered AND is not the fallback itself, returns the fallback
   * bundle with `fellBack: true`. If even the fallback is missing,
   * throws - `describe()` MUST guarantee `'en'` is registered before
   * resolving anything.
   */
  resolve(requested: Locale): ResolvedLocale {
    const direct = this.bundles.get(requested);
    if (direct !== undefined) {
      return { used: requested, data: direct, fellBack: false };
    }
    const fallback = this.bundles.get(FALLBACK_LOCALE);
    if (fallback === undefined) {
      throw new Error(
        `cronforge: no fallback locale '${FALLBACK_LOCALE}' is registered; this is a library bug`,
      );
    }
    return { used: FALLBACK_LOCALE, data: fallback, fellBack: true };
  }
}

/** Singleton registry shared by `describe()` and `registerLocale()`. */
export const localeRegistry = new LocaleRegistry();
