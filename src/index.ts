/**
 * CronForge - zero-dependency TypeScript toolkit for cron expressions.
 *
 * Public surface: six top-level functions plus a result-style builder
 * variant and a locale registration utility (Constitution Principle IV).
 *
 *   - parse, tryParse       - string  -> CronExpression
 *   - validate              - string  -> ValidationResult (never throws)
 *   - describe              - expr × locale -> human text
 *   - nextOccurrences       - expr × range -> Date[]
 *   - build, buildResult    - CronBuilderInput -> string
 *   - registerLocale        - runtime locale extension
 */

// =============================================================================
// Types - already shipped at the foundational milestone (Phase 2)
// =============================================================================

export type { CronMode, ResolvedCronMode, FieldName, MacroName, SourcePosition } from './ast/dialect.js';
export type { FieldAst, FieldSet, CronExpression } from './ast/nodes.js';
export type { ValidationError, ValidationResult } from './parser/errors.js';
export { ParseError } from './parser/errors.js';
export type { BuildError } from './builder/errors.js';
export type { Result } from './result/result.js';
export type { Locale, LocaleData } from './describer/locales/index.js';

// =============================================================================
// Functions - wired in by the user-story phases (see specs/001-core-toolkit/tasks.md)
// =============================================================================

export { parse, tryParse } from './parser/parse.js';
export type { ParseOptions } from './parser/parse.js';
export { validate } from './validator/validate.js';
export type { ValidateOptions } from './validator/validate.js';
export { describe } from './describer/describe.js';
export type { DescribeOptions } from './describer/describe.js';
export { registerLocale } from './describer/register.js';
export type { TimeFormat } from './describer/locales/index.js';
export { nextOccurrences } from './iterator/next-occurrences.js';
export type { NextOccurrencesOptions } from './iterator/next-occurrences.js';
export { build, buildResult } from './builder/build.js';
export type { BuildOptions } from './builder/build.js';
export type {
  CronBuilderInput,
  Weekday,
  Month,
  TimeOfDay,
} from './builder/input.js';
