/** Iteration ceiling — `next-occurrences.ts` throws `no-match-in-search-window`
 *  past this many steps. 50k covers any sane cron over several years. */
export const MAX_ITERATION_STEPS = 50_000;
