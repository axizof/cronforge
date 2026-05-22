import { describe, it, expect } from 'vitest';
import { parse } from '../../../src/parser/parse.js';
import { serialize } from '../../../src/serializer/serialize.js';

const CASES_STD: ReadonlyArray<readonly [string, string]> = [
  ['* * * * *', '* * * * *'],
  ['*/5 * * * *', '*/5 * * * *'],
  ['0 9-17 * * *', '0 9-17 * * *'],
  ['15,30,45 * * * *', '15,30,45 * * * *'],
  ['0 0 1 1 *', '0 0 1 1 *'],
  ['0-30/10 * * * *', '0-30/10 * * * *'],
];

const CASES_QTZ: ReadonlyArray<readonly [string, string]> = [
  ['0 0 12 ? * MON', '0 0 12 ? * 2'],
  ['0 0 12 L * ?', '0 0 12 L * ?'],
  ['0 0 12 L-3 * ?', '0 0 12 L-3 * ?'],
  ['0 0 12 15W * ?', '0 0 12 15W * ?'],
  ['0 0 12 ? * 6L', '0 0 12 ? * 6L'],
  ['0 0 12 ? * 5#3', '0 0 12 ? * 5#3'],
  ['0 0 12 1 6 ? 2026', '0 0 12 1 6 ? 2026'],
];

describe('serialize', () => {
  for (const [input, expected] of CASES_STD) {
    it(`standard: parse -> serialize: ${input} -> ${expected}`, () => {
      const expr = parse(input, { mode: 'standard' });
      expect(serialize(expr)).toBe(expected);
    });
  }

  for (const [input, expected] of CASES_QTZ) {
    it(`quartz: parse -> serialize: ${input} -> ${expected}`, () => {
      const expr = parse(input, { mode: 'quartz' });
      expect(serialize(expr)).toBe(expected);
    });
  }

  it('macros serialize back as the macro token', () => {
    const expr = parse('@daily', { mode: 'standard' });
    expect(serialize(expr)).toBe('@daily');
  });

  it('@reboot serialises as @reboot', () => {
    const expr = parse('@reboot', { mode: 'standard' });
    expect(serialize(expr)).toBe('@reboot');
  });

  it('serialise -> parse round-trip preserves AST shape (standard)', () => {
    for (const [input] of CASES_STD) {
      const expr = parse(input, { mode: 'standard' });
      const reparsed = parse(serialize(expr), { mode: 'standard' });
      // Compare the resolved fields, not the source string.
      expect(JSON.stringify(reparsed.fields)).toBe(JSON.stringify(expr.fields));
    }
  });

  it('serialise -> parse round-trip preserves AST shape (quartz)', () => {
    for (const [input] of CASES_QTZ) {
      const expr = parse(input, { mode: 'quartz' });
      const reparsed = parse(serialize(expr), { mode: 'quartz' });
      expect(JSON.stringify(reparsed.fields)).toBe(JSON.stringify(expr.fields));
    }
  });
});
