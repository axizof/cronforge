import { deepFreeze } from '../ast/freeze.js';
import { wildcardField } from '../ast/nodes.js';
import type { FieldAst, FieldSet } from '../ast/nodes.js';
import type { MacroName } from '../ast/dialect.js';

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
  '@hourly', '@daily', '@midnight', '@weekly',
  '@monthly', '@yearly', '@annually', '@reboot',
]);

/** Return the standard-mode field expansion, or `null` for `@reboot`. */
export function expandMacro(macro: MacroName): FieldSet | null {
  if (macro === '@reboot') return null;
  return MACRO_FIELDS[macro];
}

export function isRecognisedMacro(token: string): token is MacroName {
  return RECOGNISED_MACROS.has(token as MacroName);
}

function value(n: number): FieldAst {
  return deepFreeze({ kind: 'value', value: n } as const);
}

function buildFieldSet(overrides: Partial<FieldSet>): FieldSet {
  const w = wildcardField();
  return deepFreeze({
    minute: overrides.minute ?? w,
    hour: overrides.hour ?? w,
    dom: overrides.dom ?? w,
    month: overrides.month ?? w,
    dow: overrides.dow ?? w,
  });
}
