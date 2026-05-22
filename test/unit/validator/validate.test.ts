import { describe, it, expect } from 'vitest';
import { validate } from '../../../src/validator/validate.js';

describe('validate() - spec acceptance scenarios', () => {
  // US1 scenario 1
  it('accepts */5 * * * * in standard mode', () => {
    const r = validate('*/5 * * * *', { mode: 'standard' });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  // US1 scenario 2
  it('accepts 0 0 12 ? * MON-FRI in Quartz mode', () => {
    const r = validate('0 0 12 ? * MON-FRI', { mode: 'quartz' });
    expect(r.valid).toBe(true);
  });

  // US1 scenario 3
  it('rejects 6-field input in standard mode with field-count error', () => {
    const r = validate('0 0 12 * * MON', { mode: 'standard' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]?.code).toBe('field-count-standard');
    expect(r.errors[0]?.field).toBe('whole');
  });

  // US1 scenario 4
  it('rejects Quartz dom+dow both specified', () => {
    const r = validate('0 0 12 * * MON', { mode: 'quartz' });
    expect(r.valid).toBe(false);
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain('quartz-dom-dow-conflict');
  });

  // US1 scenario 5
  it('@daily resolves and is valid in standard mode', () => {
    const r = validate('@daily', { mode: 'standard' });
    expect(r.valid).toBe(true);
  });

  // US1 scenario 6
  it('mode: auto resolves a 5-field standard expression', () => {
    const r = validate('* * * 6-8 *', { mode: 'auto' });
    expect(r.valid).toBe(true);
  });

  // US1 scenario 7 - never throws
  it('never throws for any input', () => {
    const inputs = [
      '', '   ', '@unknown', '0 0 12 * * MON', '99 * * * *',
      '* '.repeat(1000), 'x'.repeat(10_000),
    ];
    for (const s of inputs) {
      expect(() => validate(s, { mode: 'standard' })).not.toThrow();
    }
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
