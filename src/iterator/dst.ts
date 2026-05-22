/**
 * DST policy markers - kept as a small module so the iterator's logic
 * can be read alongside the policy documentation.
 *
 * Per spec Assumptions §DST and FR-020:
 *
 *   - **Spring-forward gap** (wall-clock skips ahead). An expression
 *     scheduled at a non-existent local time MUST advance to the next
 *     matching valid time. This is handled implicitly by the iterator:
 *     `wallClockToUtc` returns the first valid instant ≥ the target,
 *     and the iterator's verify-then-loop pass re-evaluates against the
 *     (possibly different) resulting wall-clock.
 *
 *   - **Fall-back overlap** (wall-clock repeats one hour). The expression
 *     MUST fire ONCE at the FIRST wall-clock instance. `wallClockToUtc`
 *     implements this by checking whether `targetUtc - 1h` produces the
 *     same wall-clock; if so it returns the earlier instant.
 *
 * Both rules are tested in `test/integration/iterator-dst.test.ts`
 * against `Europe/Paris` (spring-forward 2026-03-29, fall-back
 * 2026-10-25).
 */

/** Maximum number of internal iteration steps before
 *  `next-occurrences.ts` throws `'no-match-in-search-window'` (per spec
 *  Edge Cases / FR upper bound). 50 000 covers any sane cron at any
 *  reasonable timezone within several years. */
export const MAX_ITERATION_STEPS = 50_000;
