/** Dialect selector accepted by every public entry point. */
export type CronMode = 'standard' | 'quartz' | 'auto';

/** Resolved dialect on a parsed expression. Never `'auto'`. */
export type ResolvedCronMode = 'standard' | 'quartz';

/** Field identifier used in errors and per-field rendering. */
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

/** Half-open `[start, end)` character offsets in the source. */
export interface SourcePosition {
  readonly start: number;
  readonly end: number;
}

export const QUARTZ_ONLY_CHARS = ['?', 'L', 'W', '#'] as const;

/**
 * Detect the dialect of a tokenised expression from its raw whitespace-split
 * field array. Returns `null` when neither heuristic applies (the caller
 * surfaces it as `auto-detect-failed`).
 *
 * - 5 fields, no Quartz-only chars → `'standard'`
 * - 6 or 7 fields → `'quartz'`
 * - 5 fields with any Quartz-only char → `null` (ambiguous)
 * - anything else → `null`
 */
export function detectDialect(rawFields: ReadonlyArray<string>): ResolvedCronMode | null {
  const count = rawFields.length;
  if (count === 5) return containsQuartzOnlyChars(rawFields) ? null : 'standard';
  if (count === 6 || count === 7) return 'quartz';
  return null;
}

export function containsQuartzOnlyChars(rawFields: ReadonlyArray<string>): boolean {
  for (const field of rawFields) {
    for (const ch of QUARTZ_ONLY_CHARS) {
      if (field.includes(ch)) return true;
    }
  }
  return false;
}
