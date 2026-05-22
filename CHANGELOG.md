# Changelog

All notable changes to `cronforge` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/) and the
project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

Initial public release. The full v1.0 toolkit lands as a single shipment.

### Added - Core

- `parse(expression, options)` - string --> immutable `CronExpression`. Throws
  `ParseError` on invalid input.
- `tryParse(expression, options)` - `Result<CronExpression, ParseError>`. Never
  throws (FR-002, FR-004).
- `validate(expression, options)` - structured `ValidationResult`. Never throws.
  Stable, machine-readable `code` per error.
- `describe(input, options)` - human-readable description with locale fallback.
- `nextOccurrences(input, count, options)` - IANA-timezone-aware iterator with
  documented DST policy (spring-forward gap --> skip; fall-back overlap --> fire
  once at first wall-clock instance).
- `build(input, options)` and `buildResult(input, options)` - structured input
  --> cron string with a round-trip self-check.
- `registerLocale(code, data)` - runtime locale extension.

### Added - Dialects

- Standard Unix cron (5 fields), with macro support (`@hourly`, `@daily`,
  `@midnight`, `@weekly`, `@monthly`, `@yearly`, `@annually`, `@reboot`).
- Quartz cron (6 or 7 fields), with `?`, `L`, `L-N`, `nL`, `nW`, `n#m`.
- Auto-detection (`mode: 'auto'`) based on field count + Quartz-only chars.

### Added - Locales

- Built-in: English (`en`), French (`fr`), Spanish (`es`), German (`de`),
  Italian (`it`). Each ships as a TypeScript module plus an
  `i18next`-compatible JSON file at `cronforge/locales/<code>.json`.

### Added - Quality & infrastructure

- Strict TypeScript (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).
- Dual ESM + CommonJS distribution with matching `.d.ts` per condition.
- `sideEffects: false` declared for tree-shakeability.
- Conventional Commits enforced via `commitlint` (+ AI-attribution blocker).
- `husky` pre-commit hooks running lint + typecheck.
- `shared-tests/cases.json` - language-agnostic fixture file (53 cases at GA)
  consumed by the TypeScript test suite and the future Java port.

### Constitution

- Adopted constitution v1.0.0 - see
  [.specify/memory/constitution.md](./.specify/memory/constitution.md).
- All 13 principles verified at GA via the audit in T108.

[1.0.0]: https://github.com/battlefilm/cronforge/releases/tag/v1.0.0
