import { deepFreeze } from '../ast/freeze.js';
import { wildcardField } from '../ast/nodes.js';
import type { FieldAst, FieldSet } from '../ast/nodes.js';
import type { MacroName } from '../ast/dialect.js';

/**
 * Macro -> standard-mode 5-field equivalent. `@reboot` has no equivalent
 * (it is a daemon trigger, not a schedule) and is represented separately
 * so the iterator can refuse it (FR-021).
 */
const MACRO_FIELDS: Readonly<Record<Exclude<MacroName, '@reboot'>, FieldSet>> = deepFreeze({
  '@hourly':   buildFieldSet({ minute: value(0) }),
  '@daily':    buildFieldSet({ minute: value(0), hour: value(0) }),
  '@midnight': buildFieldSet({ minute: value(0), hour: value(0) }),
  '@weekly':   buildFieldSet({ minute: value(0), hour: value(0), dow: value(0) }),
  '@monthly':  buildFieldSet({ minute: value(0), hour: value(0), dom: value(1) }),
  '@yearly':   buildFieldSet({
    minute: value(0),
    hour: value(0),
    dom: value(1),
    month: value(1),
  }),
  '@annually': buildFieldSet({
    minute: value(0),
    hour: value(0),
    dom: value(1),
    month: value(1),
  }),
});

const RECOGNISED_MACROS: ReadonlySet<MacroName> = new Set([
  '@hourly',
  '@daily',
  '@midnight',
  '@weekly',
  '@monthly',
  '@yearly',
  '@annually',
  '@reboot',
]);

/**
 * Return the standard-mode 5-field expansion for a macro, or `null` for
 * `@reboot` (no schedule semantics). Unknown macros throw - call
 * `isRecognisedMacro` first.
 *
 * @example
 * ```ts
 * expandMacro('@daily'); // { minute: {kind:'value',value:0}, hour: ..., ... }
 * expandMacro('@reboot'); // null
 * ```
 */
export function expandMacro(macro: MacroName): FieldSet | null {
  if (macro === '@reboot') return null;
  return MACRO_FIELDS[macro];
}

/** True iff the given token is one of the recognised macros. */
export function isRecognisedMacro(token: string): token is MacroName {
  return RECOGNISED_MACROS.has(token as MacroName);
}

function value(n: number): FieldAst {
  return deepFreeze({ kind: 'value', value: n } as const);
}

function buildFieldSet(overrides: Partial<FieldSet>): FieldSet {
  const wildcard = wildcardField();
  const fs: FieldSet = {
    minute: overrides.minute ?? wildcard,
    hour: overrides.hour ?? wildcard,
    dom: overrides.dom ?? wildcard,
    month: overrides.month ?? wildcard,
    dow: overrides.dow ?? wildcard,
  };
  return deepFreeze(fs);
}
