/**
 * Shared scalar / option types used across every layer.
 *
 * Per Constitution Principle V, all mode selectors are string literal
 * unions, never booleans. The exhaustive `ResolvedCronMode` excludes
 * `'auto'` so that downstream layers (validator, describer, iterator) can
 * assume a concrete dialect.
 */

/** User-facing dialect selector - accepted by `parse`, `tryParse`,
 *  `validate`, `describe`, `nextOccurrences`, `build`. */
export type CronMode = 'standard' | 'quartz' | 'auto';

/** Resolved dialect - present on a parsed `CronExpression`. Never `'auto'`. */
export type ResolvedCronMode = 'standard' | 'quartz';

/** Field identifiers used in errors and per-field rendering / validation. */
export type FieldName =
  | 'seconds'
  | 'minute'
  | 'hour'
  | 'dom'
  | 'month'
  | 'dow'
  | 'year'
  | 'whole';

/** Recognised cron macros. */
export type MacroName =
  | '@hourly'
  | '@daily'
  | '@midnight'
  | '@weekly'
  | '@monthly'
  | '@yearly'
  | '@annually'
  | '@reboot';

/** Character offsets into the source string - half-open `[start, end)`. */
export interface SourcePosition {
  readonly start: number;
  readonly end: number;
}

/** Characters that only appear in Quartz expressions. Used by the dialect
 *  auto-detector and by Quartz-only field validation. */
export const QUARTZ_ONLY_CHARS = ['?', 'L', 'W', '#'] as const;

/**
 * Detect the dialect of a tokenised expression from its raw whitespace-split
 * field array. Returns `'standard'`, `'quartz'`, or `null` when neither
 * heuristic applies (the caller surfaces this as a parse error).
 *
 * Decision rules (per FR-006 and spec Edge Cases):
 *   - 5 fields AND no Quartz-only characters -> `'standard'`
 *   - 6 or 7 fields -> `'quartz'` (field count is decisive)
 *   - 5 fields with any Quartz-only character -> `null` (ambiguous; the
 *     caller should report a validation error)
 *   - anything else -> `null`
 *
 * @example
 * ```ts
 * detectDialect(['*','*','*','6-8','*']);          // 'standard'
 * detectDialect(['0','0','12','?','*','MON']);     // 'quartz'
 * detectDialect(['0','0','12','*','*','MON','#3']); // 'quartz'
 * ```
 */
export function detectDialect(rawFields: ReadonlyArray<string>): ResolvedCronMode | null {
  const count = rawFields.length;
  if (count === 5) {
    return containsQuartzOnlyChars(rawFields) ? null : 'standard';
  }
  if (count === 6 || count === 7) return 'quartz';
  return null;
}

/** True when any raw field contains a Quartz-only character. */
export function containsQuartzOnlyChars(rawFields: ReadonlyArray<string>): boolean {
  for (const field of rawFields) {
    for (const ch of QUARTZ_ONLY_CHARS) {
      if (field.includes(ch)) return true;
    }
  }
  return false;
}
