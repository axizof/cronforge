import { describe, it, expect } from 'vitest';
import { validate } from '../../../src/validator/validate.js';

describe('validate()', () => {
  it('accepts */5 * * * * in standard mode', () => {
    const r = validate('*/5 * * * *', { mode: 'standard' });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('accepts 0 0 12 ? * MON-FRI in Quartz mode', () => {
    const r = validate('0 0 12 ? * MON-FRI', { mode: 'quartz' });
    expect(r.valid).toBe(true);
  });

  it('rejects 6-field input in standard mode with field-count error', () => {
    const r = validate('0 0 12 * * MON', { mode: 'standard' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]?.code).toBe('field-count-standard');
    expect(r.errors[0]?.field).toBe('whole');
  });

  it('rejects Quartz dom+dow both specified', () => {
    const r = validate('0 0 12 * * MON', { mode: 'quartz' });
    expect(r.valid).toBe(false);
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain('quartz-dom-dow-conflict');
  });

  it('@daily resolves and is valid in standard mode', () => {
    const r = validate('@daily', { mode: 'standard' });
    expect(r.valid).toBe(true);
  });

  it('mode: auto resolves a 5-field standard expression', () => {
    const r = validate('* * * 6-8 *', { mode: 'auto' });
    expect(r.valid).toBe(true);
  });

  it('never throws for any input', () => {
    const inputs = [
      '',
      '   ',
      '@unknown',
      '0 0 12 * * MON',
      '99 * * * *',
      '* '.repeat(1000),
      'x'.repeat(10_000),
    ];
    for (const s of inputs) {
      expect(() => validate(s, { mode: 'standard' })).not.toThrow();
    }
  });

  it('reports a non-string input instead of throwing', () => {
    const r = validate(42 as unknown as string, { mode: 'standard' });
    expect(r.errors.map((e) => e.code)).toEqual(['not-a-string']);
  });

  it('error codes are stable strings', () => {
    const r = validate('99 * * * *', { mode: 'standard' });
    expect(r.errors[0]?.code).toBe('value-out-of-range');
    expect(typeof r.errors[0]?.code).toBe('string');
  });

  it('rejects both dom and dow as ? (no day to fire)', () => {
    const r = validate('0 0 12 ? * ?', { mode: 'quartz' });
    expect(r.valid).toBe(false);
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain('quartz-dom-dow-both-any');
  });

  it('null safety: errors is always a frozen array', () => {
    const r = validate('* * * * *', { mode: 'standard' });
    expect(Object.isFrozen(r.errors)).toBe(true);
  });

  it('rejects step-base of literal value', () => {
    const r = validate('5/2 * * * *', { mode: 'standard' });
    expect(r.valid).toBe(false);
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain('step-base-invalid');
  });
});

describe('validate() - error codes', () => {
  it.each([
    ['1-x * * * *', 'standard', ['invalid-literal']],
    ['x/5 * * * *', 'standard', ['invalid-literal']],
    ['*/x * * * *', 'standard', ['step-not-positive']],
    ['1-5/0 * * * *', 'standard', ['step-not-positive']],
    ['1,,2 * * * *', 'standard', ['empty-list-member']],
    ['? * * * *', 'standard', ['quartz-only-feature-in-standard']],
    ['* * * * L', 'standard', ['quartz-only-feature-in-standard']],
    ['* * * * * *', 'standard', ['field-count-standard']],
    ['* * * *', 'quartz', ['field-count-quartz']],
    ['@hourly', 'quartz', ['macro-in-quartz']],
    ['0 ? 12 * * ?', 'quartz', ['any-not-allowed-here']],
    ['0 0 L * * ?', 'quartz', ['last-dom-not-allowed-here']],
    ['0 0 12 L-31 * ?', 'quartz', ['last-dom-offset-out-of-range']],
    ['0 0 12 32W * ?', 'quartz', ['value-out-of-range']],
    ['0 0 12 ? * 8#2', 'quartz', ['value-out-of-range']],
    ['0 0 12 ? * MON 1960', 'quartz', ['value-out-of-range']],
    ['* * * * * * * *', 'auto', ['auto-detect-failed']],
  ] as const)('%s (%s) -> %j', (expression, mode, codes) => {
    expect(validate(expression, { mode }).errors.map((e) => e.code)).toEqual(codes);
  });
});
