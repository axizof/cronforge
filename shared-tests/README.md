# shared-tests/

This directory holds language-agnostic test fixtures that pin the behaviour
of every CronForge implementation. The TypeScript library
(`cronforge`) consumes `cases.json` via
[`test/integration/shared-fixtures.test.ts`](../test/integration/shared-fixtures.test.ts).
The future Java port (`cronforge-java`) will vendor this directory
verbatim and write a parallel runner.

## Editing rules

1. **Treat `cases.json` as the source of truth.** When TS-side behaviour
   changes such that an existing case's output changes, update the
   fixture in the same PR - never fork it across implementations.
2. **IDs are stable.** Once a `id` ships, do not rename it. Add new IDs
   for new cases.
3. **ISO-8601 with explicit timezone.** Every date string must end in
   `Z` or a `±HH:MM` offset. Don't rely on the runner's default zone.
4. **`mode` matches what an end-user would pass.** If a case exercises
   auto-detection, set `mode: "auto"` and assert `dialect` separately.
5. **Invalid cases assert at least one error code.** Use the stable
   code strings from `src/validator/rules/*.ts` (`value-out-of-range`,
   `quartz-dom-dow-conflict`, `field-count-standard`, …).

## Vendoring into the Java repo

Copy this entire directory verbatim:

```bash
cp -r cronforge/shared-tests cronforge-java/src/test/resources/
```

Write the Java-side runner against `cases.json` using the schema in
`cases.schema.json`. Any divergence between TS and Java implementations
is a behaviour bug in whichever side disagrees with the fixture -
fix the bug, don't fork the fixture.
