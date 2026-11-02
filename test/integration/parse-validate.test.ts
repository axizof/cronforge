import { describe, it, expect } from 'vitest';
import { parse, tryParse, validate } from '../../src/index.js';

interface Fixture {
  readonly id: string;
  readonly expression: string;
  readonly mode: 'standard' | 'quartz' | 'auto';
  readonly valid: boolean;
  readonly dialect?: 'standard' | 'quartz';
  readonly errorCodes?: ReadonlyArray<string>;
}

const FIXTURES: ReadonlyArray<Fixture> = [
  // -- standard valid
  { id: 'std-001', expression: '* * * * *', mode: 'standard', valid: true, dialect: 'standard' },
  { id: 'std-002', expression: '*/5 * * * *', mode: 'standard', valid: true, dialect: 'standard' },
  { id: 'std-003', expression: '0 0 * * *', mode: 'standard', valid: true, dialect: 'standard' },
  {
    id: 'std-004',
    expression: '0 9-17 * * MON-FRI',
    mode: 'standard',
    valid: true,
    dialect: 'standard',
  },
  { id: 'std-005', expression: '0 0 1 1 *', mode: 'standard', valid: true, dialect: 'standard' },
  {
    id: 'std-006',
    expression: '15,30,45 * * * *',
    mode: 'standard',
    valid: true,
    dialect: 'standard',
  },
  {
    id: 'std-007',
    expression: '* * * jan-mar *',
    mode: 'standard',
    valid: true,
    dialect: 'standard',
  },
  {
    id: 'std-008',
    expression: '0-30/10 * * * *',
    mode: 'standard',
    valid: true,
    dialect: 'standard',
  },

  // -- macros
  { id: 'mac-001', expression: '@hourly', mode: 'standard', valid: true, dialect: 'standard' },
  { id: 'mac-002', expression: '@daily', mode: 'standard', valid: true, dialect: 'standard' },
  { id: 'mac-003', expression: '@weekly', mode: 'standard', valid: true, dialect: 'standard' },
  { id: 'mac-004', expression: '@monthly', mode: 'standard', valid: true, dialect: 'standard' },
  { id: 'mac-005', expression: '@yearly', mode: 'standard', valid: true, dialect: 'standard' },
  { id: 'mac-006', expression: '@reboot', mode: 'standard', valid: true, dialect: 'standard' },

  // -- quartz valid
  { id: 'qtz-001', expression: '0 0 12 ? * MON', mode: 'quartz', valid: true, dialect: 'quartz' },
  {
    id: 'qtz-002',
    expression: '0 0 12 ? * MON-FRI',
    mode: 'quartz',
    valid: true,
    dialect: 'quartz',
  },
  { id: 'qtz-003', expression: '0 */15 * ? * *', mode: 'quartz', valid: true, dialect: 'quartz' },
  { id: 'qtz-004', expression: '0 0 12 L * ?', mode: 'quartz', valid: true, dialect: 'quartz' },
  { id: 'qtz-005', expression: '0 0 12 15W * ?', mode: 'quartz', valid: true, dialect: 'quartz' },
  { id: 'qtz-006', expression: '0 0 12 ? * 6L', mode: 'quartz', valid: true, dialect: 'quartz' },
  { id: 'qtz-007', expression: '0 0 12 ? * 5#3', mode: 'quartz', valid: true, dialect: 'quartz' },
  {
    id: 'qtz-008',
    expression: '0 0 12 1 6 ? 2026',
    mode: 'quartz',
    valid: true,
    dialect: 'quartz',
  },

  // -- auto
  { id: 'auto-001', expression: '* * * 6-8 *', mode: 'auto', valid: true, dialect: 'standard' },
  { id: 'auto-002', expression: '0 0 12 ? * MON', mode: 'auto', valid: true, dialect: 'quartz' },

  // -- invalid
  { id: 'bad-001', expression: '', mode: 'standard', valid: false, errorCodes: ['empty-input'] },
  {
    id: 'bad-002',
    expression: '@foo',
    mode: 'standard',
    valid: false,
    errorCodes: ['unknown-macro'],
  },
  {
    id: 'bad-003',
    expression: '99 * * * *',
    mode: 'standard',
    valid: false,
    errorCodes: ['value-out-of-range'],
  },
  {
    id: 'bad-004',
    expression: '0 0 12 * * MON',
    mode: 'quartz',
    valid: false,
    errorCodes: ['quartz-dom-dow-conflict'],
  },
  {
    id: 'bad-005',
    expression: '0 0 12 * * MON',
    mode: 'standard',
    valid: false,
    errorCodes: ['field-count-standard'],
  },
  { id: 'bad-006', expression: '? * * * *', mode: 'standard', valid: false },
  {
    id: 'bad-007',
    expression: '*/0 * * * *',
    mode: 'standard',
    valid: false,
    errorCodes: ['step-not-positive'],
  },
  {
    id: 'bad-008',
    expression: '30-10 * * * *',
    mode: 'standard',
    valid: false,
    errorCodes: ['range-inverted'],
  },
];

describe('integration: parse + validate', () => {
  for (const f of FIXTURES) {
    it(`${f.id}: validate ${JSON.stringify(f.expression)} (${f.mode}) -> valid=${f.valid}`, () => {
      const r = validate(f.expression, { mode: f.mode });
      expect(r.valid).toBe(f.valid);
      if (f.errorCodes !== undefined) {
        const codes = r.errors.map((e) => e.code);
        for (const expectedCode of f.errorCodes) {
          expect(codes).toContain(expectedCode);
        }
      }
    });

    if (f.valid) {
      it(`${f.id}: parse succeeds and dialect matches`, () => {
        const expr = parse(f.expression, { mode: f.mode });
        if (f.dialect !== undefined) expect(expr.dialect).toBe(f.dialect);
      });

      it(`${f.id}: tryParse returns ok`, () => {
        const r = tryParse(f.expression, { mode: f.mode });
        expect(r.ok).toBe(true);
      });
    }
  }
});
