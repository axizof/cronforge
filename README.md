# cronforge

Parse, validate, describe and schedule cron expressions in TypeScript, with no runtime
dependencies.

## Features

- **Plain-language descriptions**: `*/15 9-17 * * 1-5` becomes "Every 15 minutes, between
  9:00 AM and 5:59 PM, from Monday through Friday", in English, French, Spanish, German or
  Italian. You can add more languages at runtime. [Examples](#cron-to-plain-language)
- **Validation for forms**: every error has a stable code, the field it belongs to and its
  position in the input, so you can highlight it and translate the message.
- **Next run times** in any IANA timezone, with a defined behaviour when clocks change for
  daylight saving time.
- **Builder**: turns form-style input (days, times, ranges) into a valid expression.
- **Two dialects**: standard Unix cron (5 fields, `@daily`…) and Quartz (6 or 7 fields with
  seconds and year, `L`, `W`, `#`), never mixed up.
- ESM and CommonJS builds with type definitions. Runs on Node.js 22+ and in browsers.

It computes schedules but does not run jobs. To run them, use a scheduler such as
[node-cron](https://www.npmjs.com/package/node-cron), BullMQ, a systemd timer or a
Kubernetes CronJob.

## Install

```sh
npm install cronforge
```

## Quick look

```ts
import { validate, describe, nextOccurrences, build } from 'cronforge';

validate('0 25 * * *', { mode: 'standard' });
// { valid: false, errors: [{ code: 'value-out-of-range', field: 'hour',
//   position: { start: 2, end: 4 }, message: 'Value 25 is out of range for hour (allowed: 0–23)', ... }] }

describe('*/10 9-17 * * 1-5', { mode: 'standard', locale: 'en' });
// 'Every 10 minutes, between 9:00 AM and 5:59 PM, from Monday through Friday'

describe('0 30 8 ? * MON-FRI', { mode: 'quartz', locale: 'fr' });
// 'À 08h30, du lundi au vendredi'

nextOccurrences('0 9 * * 1-5', 2, {
  mode: 'standard',
  timezone: 'Europe/Paris',
  startFrom: new Date('2026-06-05T12:00:00Z'), // a Friday
});
// [2026-06-08T07:00:00.000Z, 2026-06-09T07:00:00.000Z]

build(
  { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } },
  { mode: 'standard' },
);
// '0 9 * * 1,3,5'
```

## Cron to plain language

`describe` covers every field form (lists, ranges, steps, Quartz extensions), not just the
common shortcuts.

| Expression                | `describe(expression, { mode, locale: 'en' })`                            |
| ------------------------- | ------------------------------------------------------------------------- |
| `*/5 * * * *`             | Every 5 minutes                                                           |
| `0 * * * *`               | Every hour                                                                |
| `30 9 * * *`              | At 9:30 AM, every day                                                     |
| `0 9 * * 1-5`             | At 9:00 AM, from Monday through Friday                                    |
| `0 9 * * MON,WED,FRI`     | At 9:00 AM, on Monday, Wednesday and Friday                               |
| `0 0 1,15 * *`            | At 12:00 AM, on the 1st and 15th of the month                             |
| `0 0 1 */3 *`             | At 12:00 AM, on the 1st of the month, in January, April, July and October |
| `@weekly`                 | Every Sunday, at midnight                                                 |
| `*/30 * * ? * *` (Quartz) | Every 30 seconds                                                          |
| `0 0 18 LW * ?` (Quartz)  | At 6:00 PM, on the last weekday of the month                              |
| `0 0 9 ? * 2#1` (Quartz)  | At 9:00 AM, on the first Monday of the month                              |
| `0 0 17 ? * 6L` (Quartz)  | At 5:00 PM, on the last Friday of the month                               |

The same expression, `*/15 9-17 * * 1-5`, in each built-in language:

| `locale` | Description                                                               |
| -------- | ------------------------------------------------------------------------- |
| `en`     | Every 15 minutes, between 9:00 AM and 5:59 PM, from Monday through Friday |
| `fr`     | Toutes les 15 minutes, entre 09h00 et 17h59, du lundi au vendredi         |
| `es`     | Cada 15 minutos, entre las 09:00 y las 17:59, de lunes a viernes          |
| `de`     | Alle 15 Minuten, zwischen 09:00 und 17:59, von Montag bis Freitag         |
| `it`     | Ogni 15 minuti, tra le 09:00 e le 17:59, da lunedì a venerdì              |

A typical use is a live preview under a schedule form:

```ts
const expression = build(
  { kind: 'daysOfWeek', days: ['MON', 'THU'], at: { hour: 18, minute: 30 } },
  { mode: 'standard' },
);
// '30 18 * * 1,4'

describe(expression, { mode: 'standard', locale: 'fr' });
// 'À 18h30, le lundi et jeudi'
```

## Dialects

Every function takes a `mode`. The same five characters can mean different things in Unix
cron and in Quartz, so the library does not guess unless you ask it to.

|                            | `'standard'`                                                     | `'quartz'`                                               |
| -------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| Fields                     | minute hour day-of-month month day-of-week                       | second minute hour day-of-month month day-of-week [year] |
| Day-of-week numbers        | 0–7, Sunday is 0 or 7                                            | 1–7, Sunday is 1                                         |
| Day-of-month + day-of-week | a day matching either one fires¹                                 | one of the two must be `?`                               |
| Extras                     | `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly`, `@reboot` | `L`, `L-3`, `LW`, `15W`, `6L`, `2#1`, `0/15`             |

¹ As in Vixie cron and cronie: if either field starts with `*` (e.g. `*/2`), both must match.

`mode: 'auto'` reads 6 or 7 fields as Quartz, and 5 fields as standard cron when they
contain no Quartz-only character. Anything else is rejected with `auto-detect-failed`.

Names (`JAN`–`DEC`, `SUN`–`SAT`) are accepted in both dialects and are case-insensitive.

## API

### `parse(expression, { mode })` and `tryParse(expression, { mode })`

`parse` returns a frozen `CronExpression` (the dialect plus one AST node per field) and
throws a `CronError` when the expression is invalid. `tryParse` returns
`{ ok: true, value }` or `{ ok: false, error }` and never throws.

### `validate(expression, { mode })`

Never throws. Returns `{ valid, errors }`. Each error has a stable `code`, the `field` it
belongs to, a `position` (character offsets you can use to highlight the input) and
sometimes a `suggestion`. Use `code` rather than `message` as a translation key.

### `describe(expressionOrParsed, { mode, locale, onFallback? })`

Returns a sentence. Built-in locales are `en`, `fr`, `es`, `de` and `it`. An unknown locale
falls back to English and calls `onFallback(requested, used)` if you passed it.

Add or override a language with `registerLocale(code, data)`. Keys you leave out fall back
to English. The built-in locale files are published as JSON and can serve as templates, or
be loaded into i18next:

```ts
import fr from 'cronforge/locales/fr.json' with { type: 'json' };
```

### `nextOccurrences(expressionOrParsed, count, { mode, timezone?, startFrom? })`

Returns the next `count` run times strictly after `startFrom` (default: now), as `Date`s in
ascending order. `timezone` is an IANA name such as `'Europe/Paris'` and defaults to `'UTC'`.

Around DST changes:

- A local time that does not exist (02:30 when clocks jump from 02:00 to 03:00) is skipped
  that day.
- A local time that happens twice (01:30 when clocks go back) runs once, at its first
  occurrence.

It throws a `CronError` with code `invalid-timezone`, `invalid-start-from`, `invalid-count`,
`count-too-large` (over 100,000), `reboot-not-iterable`, or `no-match-in-search-window` for an
expression that never fires, such as `0 0 31 2 *`.

### `build(input, { mode })` and `buildResult(input, { mode })`

Turns structured input into an expression. `build` throws a `CronError`; `buildResult`
returns a `Result` with a `BuildError`.

| `kind`               | Example input                                                  | Standard output               |
| -------------------- | -------------------------------------------------------------- | ----------------------------- |
| `everyN`             | `{ unit: 'minute', n: 15 }`                                    | `*/15 * * * *`                |
| `at`                 | `{ times: [{ hour: 9, minute: 0 }, { hour: 17, minute: 0 }] }` | `0 9,17 * * *`                |
| `daysOfWeek`         | `{ days: ['MON', 'FRI'], at: { hour: 9, minute: 0 } }`         | `0 9 * * 1,5`                 |
| `daysOfMonth`        | `{ days: [1, 15], at: { hour: 12, minute: 0 } }`               | `0 12 1,15 * *`               |
| `hourRange`          | `{ from: 9, to: 17 }`                                          | `0 9-17 * * *`                |
| `monthRange`         | `{ from: 'JUN', to: 'AUG' }`                                   | `* * * 6-8 *`                 |
| `nthWeekdayOfMonth`  | `{ nth: 1, weekday: 'MON', at: { hour: 8, minute: 30 } }`      | Quartz only: `0 30 8 ? * 2#1` |
| `lastDayOfMonth`     | `{ at: { hour: 23, minute: 59 } }`                             | Quartz only                   |
| `lastWeekdayOfMonth` | `{ weekday: 'FRI', at: { hour: 17, minute: 0 } }`              | Quartz only                   |
| `weekdayNearestTo`   | `{ day: 15, at: { hour: 12, minute: 0 } }`                     | Quartz only                   |

Numeric weekdays always use 0 = Sunday, whatever the mode. `at` with several times only works
when the times form a grid (each listed hour with each listed minute): 09:00 and 17:30 cannot
be one cron expression, so `buildResult` returns `times-not-expressible`.

### Errors

Every error carries a `code` that will not change between minor versions, for example
`empty-input`, `field-count-standard`, `value-out-of-range`, `range-inverted`,
`step-not-positive`, `quartz-only-feature-in-standard` or `quartz-dom-dow-conflict`.
`CronError.errors` lists every problem found in the expression, not just the first one.

## Good to know

- Steps restart at each larger unit: `*/10` in day-of-month fires on the 1st, 11th, 21st and
  31st, then on the 1st again.
- Spring's 6-field cron does not require `?`. Expressions like `0 0 9 * * MON-FRI` are
  rejected in Quartz mode with `quartz-dom-dow-conflict`, as Quartz itself does.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
