# CronForge — Examples

Practical, copy-paste-ready snippets covering every part of the public API.
For the formal contract, see [`specs/001-core-toolkit/contracts/public-api.ts`](./specs/001-core-toolkit/contracts/public-api.ts).

## Table of contents

- [1. Validate a form input](#1-validate-a-form-input)
- [2. Parse with full error handling](#2-parse-with-full-error-handling)
- [3. Auto-detect the dialect](#3-auto-detect-the-dialect)
- [4. Describe in multiple languages](#4-describe-in-multiple-languages)
- [5. Register a custom locale](#5-register-a-custom-locale)
- [6. Vendor locale JSON into i18next](#6-vendor-locale-json-into-i18next)
- [7. Next N fire times (UTC)](#7-next-n-fire-times-utc)
- [8. Timezone-aware iteration](#8-timezone-aware-iteration)
- [9. DST behaviour](#9-dst-behaviour)
- [10. Build a cron from form-style input](#10-build-a-cron-from-form-style-input)
- [11. Every builder variant](#11-every-builder-variant)
- [12. Composite builder (union of schedules)](#12-composite-builder-union-of-schedules)
- [13. Live preview pattern — builder + describer](#13-live-preview-pattern--builder--describer)
- [14. Round-trip checks](#14-round-trip-checks)
- [15. Working with Quartz `?`, `L`, `W`, `#`](#15-working-with-quartz---l-w-)
- [16. Macros](#16-macros)
- [17. Working with `Result<T, E>`](#17-working-with-resultt-e)
- [18. Patterns to avoid](#18-patterns-to-avoid)

---

## 1. Validate a form input

`validate()` never throws. Use it inside form-validation logic; surface the
error codes as i18n keys in your UI.

```ts
import { validate } from 'cronforge';

const r = validate(formValue, { mode: 'standard' });
if (!r.valid) {
  // Each error carries a stable machine-readable `code` plus a
  // position you can underline in the textarea.
  for (const e of r.errors) {
    console.error(`[${e.code}] ${e.message} at chars ${e.position.start}-${e.position.end}`);
  }
}
```

Stable error codes (use as i18n keys):

| code | when |
|---|---|
| `empty-input` | empty / whitespace string |
| `unknown-macro` | `@foo` instead of `@daily` |
| `field-count-standard` | 6+ fields in standard mode |
| `field-count-quartz` | 5 fields in Quartz mode |
| `value-out-of-range` | `99 * * * *` |
| `range-inverted` | `30-10` |
| `step-not-positive` | `*/0` |
| `step-base-invalid` | `5/2` (only `*/N` and `from-to/N` allowed) |
| `quartz-dom-dow-conflict` | both dom and dow non-`?` in Quartz |
| `quartz-only-feature-in-standard` | `?` / `L` / `W` / `#` in standard mode |

---

## 2. Parse with full error handling

`parse()` throws `ParseError` (an `Error` subclass). For result-style
handling without `try/catch`, use `tryParse()`.

```ts
import { parse, tryParse, ParseError } from 'cronforge';

// Throwing variant
try {
  const expr = parse('*/5 * * * *', { mode: 'standard' });
  console.log(expr.dialect);  // 'standard'
} catch (e) {
  if (e instanceof ParseError) {
    console.error(e.code, e.errors);
  }
}

// Result-style variant — never throws
const r = tryParse('not a cron', { mode: 'standard' });
if (r.ok) {
  console.log(r.value.fields);
} else {
  console.error(r.error.message);
}
```

---

## 3. Auto-detect the dialect

`mode: 'auto'` resolves to `'standard'` for 5-field expressions with no
Quartz-only characters, and `'quartz'` for 6- or 7-field expressions.

```ts
import { parse } from 'cronforge';

parse('* * * 6-8 *',         { mode: 'auto' }).dialect;  // 'standard'
parse('0 0 12 ? * MON',      { mode: 'auto' }).dialect;  // 'quartz'
parse('0 0 12 1 6 ? 2026',   { mode: 'auto' }).dialect;  // 'quartz'
```

A 5-field expression with Quartz-only characters (e.g. `? * * * *`) is
rejected with `code: 'auto-detect-failed'` — be explicit instead.

---

## 4. Describe in multiple languages

Built-in: `'en'`, `'fr'`, `'es'`, `'de'`, `'it'`.

```ts
import { describe } from 'cronforge';

describe('* * * 6-8 *',    { mode: 'standard', locale: 'en' });
// → 'Every minute, June through August'

describe('* * * 6-8 *',    { mode: 'standard', locale: 'fr' });
// → 'Toutes les minutes, de juin à août'

describe('0 0 12 ? * MON', { mode: 'quartz',   locale: 'es' });
// → 'A las 12:00, solo el lunes'

describe('0 0 12 ? * MON', { mode: 'quartz',   locale: 'de' });
// → 'Um 12:00, nur am Montag'

describe('0 0 12 ? * MON', { mode: 'quartz',   locale: 'it' });
// → 'Alle 12:00, solo il lunedì'
```

Unknown locales fall back to English. Observe the fallback explicitly:

```ts
describe('* * * * *', {
  mode: 'standard',
  locale: 'jp',
  onFallback: (requested, used) => {
    console.warn(`locale ${requested} not registered; used ${used}`);
  },
});
```

---

## 5. Register a custom locale

The `LocaleData` shape is compatible with `i18next` resource bundles
(see [`contracts/locale-format.md`](./specs/001-core-toolkit/contracts/locale-format.md)).

```ts
import { registerLocale, describe, type LocaleData } from 'cronforge';

const ptBR: LocaleData = {
  meta: { code: 'pt-BR', name: 'Português (Brasil)', version: '1.0.0', timeFormat: '24h' },
  atoms: {
    every_minute: 'A cada minuto',
    every_x_minutes: 'A cada {{count}} minutos',
    every_hour: 'A cada hora',
    every_x_hours: 'A cada {{count}} horas',
    every_second: 'A cada segundo',
    every_x_seconds: 'A cada {{count}} segundos',
    at_time: 'Às {{time}}',
    every_day: 'todos os dias',
    only_on_weekday: 'somente {{weekday}}',
    on_weekdays: '{{weekdays}}',
    from_to_weekday: 'de {{from}} a {{to}}',
    on_day_of_month: 'no dia {{day}} do mês',
    on_days_of_month: 'nos dias {{days}} do mês',
    last_day_of_month: 'no último dia do mês',
    last_day_offset: '{{offset}} dias antes do fim do mês',
    weekday_nearest_to: 'no dia útil mais próximo do {{day}}',
    last_weekday_of_month: 'na última {{weekday}} do mês',
    nth_weekday_of_month: 'na {{nth}} {{weekday}} do mês',
    during_months_range: 'de {{from}} a {{to}}',
    in_months: 'em {{months}}',
    in_year: 'em {{year}}',
  },
  units:  { minute: 'minuto', minutes: 'minutos', hour: 'hora', hours: 'horas', second: 'segundo', seconds: 'segundos' },
  months: { '1': 'janeiro', '2': 'fevereiro', '3': 'março', '4': 'abril', '5': 'maio', '6': 'junho', '7': 'julho', '8': 'agosto', '9': 'setembro', '10': 'outubro', '11': 'novembro', '12': 'dezembro' },
  weekdays: { '0': 'domingo', '1': 'segunda', '2': 'terça', '3': 'quarta', '4': 'quinta', '5': 'sexta', '6': 'sábado' },
  ordinals: { default: 'º' },
};

registerLocale('pt-BR', ptBR);

describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'pt-BR' });
// → 'Às 12:00, somente segunda'
```

The library deeply-freezes the bundle on registration — you cannot mutate
it afterwards.

---

## 6. Vendor locale JSON into i18next

The published package ships the canonical JSON under
`cronforge/locales/<code>.json`:

```ts
import i18n from 'i18next';
import fr from 'cronforge/locales/fr.json' with { type: 'json' };
import es from 'cronforge/locales/es.json' with { type: 'json' };

i18n.addResourceBundle('fr', 'cronforge', fr);
i18n.addResourceBundle('es', 'cronforge', es);
```

The runtime library does NOT depend on `i18next` — this is purely a
convenience for apps that already use it.

---

## 7. Next N fire times (UTC)

```ts
import { nextOccurrences } from 'cronforge';

const fires = nextOccurrences('*/5 * * * *', 5, {
  mode: 'standard',
  startFrom: new Date('2026-06-01T10:00:00Z'),
  timezone: 'UTC',
});

fires.map((d) => d.toISOString());
// [
//   '2026-06-01T10:05:00.000Z',
//   '2026-06-01T10:10:00.000Z',
//   '2026-06-01T10:15:00.000Z',
//   '2026-06-01T10:20:00.000Z',
//   '2026-06-01T10:25:00.000Z',
// ]
```

Returns a frozen array. `count === 0` returns `[]` (not an error).

---

## 8. Timezone-aware iteration

`timezone` accepts any IANA name. The wall-clock fields of the cron
expression are interpreted in that zone.

```ts
import { nextOccurrences } from 'cronforge';

// 09:00 Paris local time
nextOccurrences('0 9 * * MON-FRI', 1, {
  mode: 'standard',
  startFrom: new Date('2026-06-01T00:00:00Z'),
  timezone: 'Europe/Paris',
});
// → [2026-06-01T07:00:00.000Z]   (09:00 CEST = 07:00 UTC)

// Same expression, Tokyo
nextOccurrences('0 9 * * MON-FRI', 1, {
  mode: 'standard',
  startFrom: new Date('2026-06-01T00:00:00Z'),
  timezone: 'Asia/Tokyo',
});
// → [2026-06-01T00:00:00.000Z]   (09:00 JST = 00:00 UTC)
```

Default timezone is `'UTC'`.

---

## 9. DST behaviour

Two well-defined rules — see also `test/integration/iterator-dst.test.ts`.

### Spring-forward gap (non-existent local time → skip)

```ts
// Europe/Paris: 2026-03-29 02:30 does not exist (clocks jump 02:00 → 03:00).
nextOccurrences('30 2 * * *', 1, {
  mode: 'standard',
  startFrom: new Date('2026-03-29T00:00:00Z'),
  timezone: 'Europe/Paris',
});
// → [2026-03-30T00:30:00.000Z]
// (next valid 02:30 Paris local, on the 30th)
```

### Fall-back overlap (ambiguous local time → fire once at the first instance)

```ts
// Europe/Paris: 2026-10-25 02:30 happens twice (CEST then CET).
nextOccurrences('30 2 * * *', 2, {
  mode: 'standard',
  startFrom: new Date('2026-10-24T22:00:00Z'),
  timezone: 'Europe/Paris',
});
// → [
//   '2026-10-25T00:30:00.000Z',   // FIRST 02:30 Paris local (CEST)
//   '2026-10-26T01:30:00.000Z',   // next day's 02:30 (CET)
// ]
```

---

## 10. Build a cron from form-style input

`build()` turns a typed structured input into a cron string. Pair it with
your form state to skip writing a custom serializer per field.

```ts
import { build } from 'cronforge';

build(
  { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } },
  { mode: 'standard' },
);
// → '0 9 * * 1,3,5'
```

`buildResult()` is the never-throws variant returning `Result<string, BuildError>`.

---

## 11. Every builder variant

Each variant maps to one form-style input shape. See
[`contracts/builder-input.md`](./specs/001-core-toolkit/contracts/builder-input.md)
for the full rules.

```ts
import { build } from 'cronforge';

// every N units
build({ kind: 'everyN', unit: 'minute', n: 5 },  { mode: 'standard' });
// → '*/5 * * * *'

build({ kind: 'everyN', unit: 'hour',   n: 2 },  { mode: 'standard' });
// → '0 */2 * * *'

build({ kind: 'everyN', unit: 'day',    n: 3 },  { mode: 'standard' });
// → '0 0 */3 * *'

// at specific times
build(
  { kind: 'at', times: [{ hour: 8, minute: 0 }, { hour: 18, minute: 0 }] },
  { mode: 'standard' },
);
// → '0,0 8,18 * * *'

// specific weekdays
build(
  { kind: 'daysOfWeek', days: ['SAT', 'SUN'], at: { hour: 10, minute: 30 } },
  { mode: 'standard' },
);
// → '30 10 * * 6,0'

// specific days of month
build(
  { kind: 'daysOfMonth', days: [1, 15], at: { hour: 12, minute: 0 } },
  { mode: 'standard' },
);
// → '0 12 1,15 * *'

// hour range
build({ kind: 'hourRange', from: 9, to: 17 }, { mode: 'standard' });
// → '0 9-17 * * *'

// month range
build({ kind: 'monthRange', from: 'JUN', to: 'AUG' }, { mode: 'standard' });
// → '* * * 6-8 *'

// Quartz: 3rd Wednesday at 14:00
build(
  {
    kind: 'nthWeekdayOfMonth',
    nth: 3,
    weekday: 'WED',
    at: { hour: 14, minute: 0 },
  },
  { mode: 'quartz' },
);
// → '0 0 14 ? * 4#3'

// Quartz: last day of month at 23:59
build(
  { kind: 'lastDayOfMonth', at: { hour: 23, minute: 59 } },
  { mode: 'quartz' },
);
// → '0 59 23 L * ?'

// Quartz: last Friday of month at 17:00
build(
  { kind: 'lastWeekdayOfMonth', weekday: 'FRI', at: { hour: 17, minute: 0 } },
  { mode: 'quartz' },
);
// → '0 0 17 ? * 6L'

// Quartz: weekday nearest the 15th at noon
build(
  { kind: 'weekdayNearestTo', day: 15, at: { hour: 12, minute: 0 } },
  { mode: 'quartz' },
);
// → '0 0 12 15W * ?'
```

---

## 12. Composite builder (union of schedules)

Combine multiple parts; the resulting cron fires when ANY part fires.

```ts
import { build } from 'cronforge';

build(
  {
    kind: 'composite',
    parts: [
      { kind: 'at', times: [{ hour: 8,  minute: 0 }] },  // 08:00
      { kind: 'at', times: [{ hour: 18, minute: 0 }] },  // 18:00
    ],
  },
  { mode: 'standard' },
);
// → '0 8,18 * * *'
```

---

## 13. Live preview pattern — builder + describer

The canonical combo for a form-driven cron picker.

```tsx
import { build, describe } from 'cronforge';
import type { CronBuilderInput } from 'cronforge';

function CronPreview({ input, locale }: {
  input: CronBuilderInput;
  locale: 'en' | 'fr' | 'es' | 'de' | 'it';
}) {
  let cron: string, human: string;
  try {
    cron  = build(input, { mode: 'standard' });
    human = describe(cron, { mode: 'standard', locale });
  } catch {
    return <span className="error">Invalid input</span>;
  }
  return (
    <div>
      <code>{cron}</code>
      <p>{human}</p>
    </div>
  );
}
```

Use `buildResult()` if you prefer no try/catch:

```ts
import { buildResult, describe } from 'cronforge';

const r = buildResult(input, { mode: 'standard' });
if (!r.ok) {
  showError(r.error.code);
  return;
}
showPreview(describe(r.value, { mode: 'standard', locale: 'en' }));
```

---

## 14. Round-trip checks

`build()` self-verifies that its output re-parses cleanly. You can rely on
this in your own code too:

```ts
import { parse, build } from 'cronforge';

const cron = build(myInput, { mode: 'standard' });
const expr = parse(cron, { mode: 'standard' });          // never fails — guaranteed by build()
// expr.fields can be inspected programmatically.
```

---

## 15. Working with Quartz `?`, `L`, `W`, `#`

Quartz operators are only valid in `mode: 'quartz'`:

```ts
import { parse } from 'cronforge';

parse('0 0 12 ? * MON',  { mode: 'quartz' });  // ? = "any" — required in dom or dow
parse('0 0 12 L * ?',    { mode: 'quartz' });  // L  = last day of month
parse('0 0 12 L-3 * ?',  { mode: 'quartz' });  // L-N = N days before end of month
parse('0 0 12 ? * 6L',   { mode: 'quartz' });  // nL = last <weekday> of month (Quartz dow 6 = Friday)
parse('0 0 12 15W * ?',  { mode: 'quartz' });  // nW = weekday nearest day N
parse('0 0 12 ? * 5#3',  { mode: 'quartz' });  // n#m = m-th occurrence of weekday n
```

Quartz weekday numbering: **SUN = 1, MON = 2, …, SAT = 7**. Standard cron
uses **SUN = 0, MON = 1, …, SAT = 6**. CronForge handles the conversion
internally — you give it the dialect, it tracks the rest.

---

## 16. Macros

Standard-mode shorthand. Each macro expands to its 5-field equivalent
during parsing.

```ts
import { describe, parse } from 'cronforge';

parse('@hourly',   { mode: 'standard' });  // = '0 * * * *'
parse('@daily',    { mode: 'standard' });  // = '0 0 * * *'
parse('@midnight', { mode: 'standard' });  // = '0 0 * * *'
parse('@weekly',   { mode: 'standard' });  // = '0 0 * * 0'
parse('@monthly',  { mode: 'standard' });  // = '0 0 1 * *'
parse('@yearly',   { mode: 'standard' });  // = '0 0 1 1 *'
parse('@annually', { mode: 'standard' });  // = '0 0 1 1 *'

// @reboot is parseable but has no schedule — nextOccurrences() rejects it.
const reboot = parse('@reboot', { mode: 'standard' });
reboot.hasReboot;  // true

describe('@daily', { mode: 'standard', locale: 'en' });
// → 'Every day, at midnight'
```

Macros in Quartz mode are rejected (`code: 'macro-in-quartz'`).

---

## 17. Working with `Result<T, E>`

The discriminated union returned by `tryParse()` and `buildResult()`:

```ts
type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };
```

TypeScript narrows automatically on the `ok` discriminator:

```ts
import { tryParse } from 'cronforge';

const r = tryParse(input, { mode: 'standard' });
if (r.ok) {
  // r.value is CronExpression here
  console.log(r.value.dialect);
} else {
  // r.error is ParseError here
  console.error(r.error.code);
}
```

Helpers for constructing your own:

```ts
import { ok, err } from 'cronforge';  // re-exported from src/result/result.ts

function myValidator(input: string) {
  if (input.length === 0) return err({ code: 'empty', message: 'no input' });
  return ok(input.trim());
}
```

---

## 18. Patterns to avoid

```ts
// ❌ Don't mutate returned ASTs — they're frozen.
const expr = parse('* * * * *', { mode: 'standard' });
// expr.fields.minute = { ... };   // TypeError in strict mode

// ❌ Don't use booleans for modes — public API takes literal unions.
// validate('* * * * *', { isQuartz: false });   // type error

// ❌ Don't pass non-string to parse(). tryParse() handles it; parse() throws.
// parse(42, { mode: 'standard' });   // type error AND throws at runtime

// ❌ Don't wrap validate() in try/catch — it never throws.
const r = validate(maybeInvalid, { mode: 'standard' });
//        ^ no need for try/catch here

// ❌ Don't call nextOccurrences() on @reboot — throws 'reboot-not-iterable'.
// nextOccurrences('@reboot', 1, { mode: 'standard' });

// ❌ Don't import internals — only the documented exports are public.
// import { tokenize } from 'cronforge/src/tokenizer/tokenize.js';  // unsupported
```
