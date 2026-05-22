# cronforge

> A zero-dependency TypeScript toolkit for cron expressions - parse, validate,
> describe (multilingual), compute next occurrences, and build from structured
> input. Supports both standard Unix (5-field) and Quartz (6–7 field) dialects.

[![tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](.)
[![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen.svg)](./package.json)
[![types](https://img.shields.io/badge/types-bundled-blue.svg)](./dist/index.d.ts)

## Install

```bash
npm install cronforge
```

Requires Node.js 18+. Ships dual ESM + CommonJS with matching `.d.ts`. Works in
modern browsers (Chrome / Edge / Firefox / Safari).

## At a glance

```ts
import {
  parse, tryParse, validate, describe, nextOccurrences, build, registerLocale,
} from 'cronforge';

// 1. Validate a form input - never throws.
validate('*/5 * * * *', { mode: 'standard' });
// -> { valid: true, errors: [] }

// 2. Parse to an immutable AST.
parse('0 0 12 ? * MON-FRI', { mode: 'quartz' });
// -> CronExpression { dialect: 'quartz', fields: { ... } }

// 3. Describe in natural language (en / fr / es / de / it built-in).
describe('* * * 6-8 *', { mode: 'standard', locale: 'en' });
// -> 'Every minute, June through August'

describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'fr' });
// -> 'À 12h00, uniquement le lundi'

// 4. Compute upcoming fire times in any IANA timezone.
nextOccurrences('*/5 * * * *', 3, {
  mode: 'standard',
  startFrom: new Date('2026-06-01T10:00:00Z'),
  timezone: 'UTC',
});
// -> [2026-06-01T10:05Z, 10:10Z, 10:15Z]

// 5. Build a cron string from a structured form input.
build(
  { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } },
  { mode: 'standard' },
);
// -> '0 9 * * 1,3,5'

// 6. Register a custom locale at runtime.
registerLocale('jp', { /* LocaleData */ });
```

## Why CronForge

Existing libraries cover one slice each - [`cronstrue`](https://www.npmjs.com/package/cronstrue) for
description, [`cron-parser`](https://www.npmjs.com/package/cron-parser) for iteration,
[`cron-validator`](https://www.npmjs.com/package/cron-validator) for validation. CronForge unifies
the five operations behind one consistent, **zero-dependency**, **fully typed**, **immutable**
API designed for enterprise apps.

| Capability | cronforge | cronstrue | cron-parser | cron-validator |
|---|---|---|---|---|
| Parse | ✅ | - | ✅ | - |
| Validate (no throw) | ✅ | - | partial | ✅ |
| Describe (multilingual) | ✅ (5 langs) | ✅ | - | - |
| Next occurrences (DST-aware) | ✅ | - | ✅ | - |
| Builder (input -> cron) | ✅ | - | - | - |
| Quartz + standard dialects | ✅ | partial | - | - |
| Zero runtime dependencies | ✅ | ✅ | ✅ | ✅ |
| Tree-shakeable ESM | ✅ | partial | partial | ✅ |

## Modes

CronForge requires you to pick a dialect explicitly. This is enterprise behaviour:
the same five fields mean different things in Unix cron vs Quartz.

| Mode | Fields | Day-of-week numbering | dom/dow combination |
|---|---|---|---|
| `'standard'` | 5 (minute hour dom month dow) | 0–6 (SUN = 0) | OR semantics |
| `'quartz'` | 6 or 7 (seconds…[year]) | 1–7 (SUN = 1) | exclusive via `?` |
| `'auto'` | detect from field count + Quartz-only chars | - | - |

Quartz-only operators (`?`, `L`, `L-N`, `nL`, `nW`, `n#m`) are rejected in
standard mode with a structured error.

## Locales

Built-in: `'en'`, `'fr'`, `'es'`, `'de'`, `'it'`. Add your own with
`registerLocale(code, data)`. The locale data format is compatible with
[`i18next`](https://www.i18next.com/) resource bundles - see
[contracts/locale-format.md](./specs/001-core-toolkit/contracts/locale-format.md).

Locale JSON files are also published alongside the package and can be imported
directly into an i18next resource tree:

```ts
import fr from 'cronforge/locales/fr.json' with { type: 'json' };
i18n.addResourceBundle('fr', 'cronforge', fr);
```

## Result-style API

Every operation that can fail has both a throwing and a result-style variant
(Constitution Principle III - never throw for predictable invalidity):

| Throws | Returns `Result<T, E>` |
|---|---|
| `parse(expr, opts)` | `tryParse(expr, opts)` |
| `build(input, opts)` | `buildResult(input, opts)` |
| (n/a - never throws) | `validate(expr, opts)` |

## Out of scope

CronForge is a **compute** library. It deliberately does NOT:

- Run cron jobs (use [`node-cron`](https://www.npmjs.com/package/node-cron),
  [`bull`](https://www.npmjs.com/package/bull), Kubernetes CronJobs, etc.)

## Documentation

- [examples.md](./examples.md) - copy-paste-ready snippets for every public
  function plus real-world recipes (form preview, locale fallback, DST, i18next)
- [llms.txt](./llms.txt) - concise machine-readable index for AI assistants
  (per [llmstxt.org](https://llmstxt.org)); [llms-full.txt](./llms-full.txt)
  bundles the entire API reference, error vocabulary, and recipes in one file
- [Specification](./specs/001-core-toolkit/spec.md) - feature scope, acceptance
  criteria, success metrics
- [Implementation plan](./specs/001-core-toolkit/plan.md) - tech choices,
  architecture, constitution gates
- [Public-API contract](./specs/001-core-toolkit/contracts/public-api.ts) -
  the frozen TypeScript surface
- [Constitution](./.specify/memory/constitution.md) - non-negotiable principles
  that bind every change

## Testing

```bash
npm install
npm test                # run the full suite (vitest)
npm run test:coverage   # with V8 coverage
npm run typecheck       # tsc --noEmit
npm run build           # tsup -> dist/{index.mjs,index.cjs,index.d.ts,index.d.cts}
```

## Contributing

Commits MUST follow [Conventional Commits](https://www.conventionalcommits.org/) -
the project's `commitlint` config rejects anything else (and any commit message
containing AI-attribution trailers).

## License

MIT - see [LICENSE](./LICENSE).
