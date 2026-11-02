# shared-tests

`cases.json` lists expected behaviour (validity, error codes, descriptions, next run times)
in a language-independent format described by `cases.schema.json`. The TypeScript suite runs
it from `test/integration/shared-fixtures.test.ts`; ports to other languages should run the
same file.

Rules:

1. When behaviour changes, update the affected cases in the same pull request. If two
   implementations disagree with a case, the implementations are wrong, not the case.
2. Never rename an `id` once published; add new cases instead.
3. Dates are ISO 8601 with an explicit `Z` or offset.
4. Invalid cases assert at least one error `code`.
5. Expected values are worked out by hand from cron semantics, not copied from an
   implementation's output.
