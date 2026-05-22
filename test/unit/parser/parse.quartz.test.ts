import { describe, it, expect } from 'vitest';
import { parse } from '../../../src/parser/parse.js';

describe('parse() - Quartz mode', () => {
  it('parses a 6-field Quartz expression', () => {
    const expr = parse('0 0 12 ? * MON', { mode: 'quartz' });
    expect(expr.dialect).toBe('quartz');
    expect(expr.fields.seconds).toEqual({ kind: 'value', value: 0 });
    expect(expr.fields.minute).toEqual({ kind: 'value', value: 0 });
    expect(expr.fields.hour).toEqual({ kind: 'value', value: 12 });
    expect(expr.fields.dom).toEqual({ kind: 'any' });
    expect(expr.fields.month).toEqual({ kind: 'wildcard' });
    // Quartz numbering: MON = 2.
    expect(expr.fields.dow).toEqual({ kind: 'value', value: 2 });
    expect(expr.fields.year).toBeUndefined();
  });

  it('parses a 7-field Quartz expression with year', () => {
    const expr = parse('0 0 12 1 6 ? 2026', { mode: 'quartz' });
    expect(expr.fields.year).toEqual({ kind: 'value', value: 2026 });
  });

  it('accepts weekday mnemonics with Quartz numbering (SUN=1)', () => {
    const sun = parse('0 0 12 ? * SUN', { mode: 'quartz' });
    expect(sun.fields.dow).toEqual({ kind: 'value', value: 1 });
    const sat = parse('0 0 12 ? * SAT', { mode: 'quartz' });
    expect(sat.fields.dow).toEqual({ kind: 'value', value: 7 });
  });

  it('parses MON-FRI range', () => {
    const expr = parse('0 0 12 ? * MON-FRI', { mode: 'quartz' });
    expect(expr.fields.dow).toEqual({ kind: 'range', from: 2, to: 6 });
  });

  it('parses ? as Any', () => {
    const expr = parse('0 0 12 ? * MON', { mode: 'quartz' });
    expect(expr.fields.dom).toEqual({ kind: 'any' });
  });

  it('parses L as last day of month', () => {
    const expr = parse('0 0 12 L * ?', { mode: 'quartz' });
    expect(expr.fields.dom).toEqual({ kind: 'lastDom', offset: 0 });
  });

  it('parses L-3 with offset', () => {
    const expr = parse('0 0 12 L-3 * ?', { mode: 'quartz' });
    expect(expr.fields.dom).toEqual({ kind: 'lastDom', offset: 3 });
  });

  it('parses 6L as last <weekday> of month', () => {
    const expr = parse('0 0 12 ? * 6L', { mode: 'quartz' });
    expect(expr.fields.dow).toEqual({ kind: 'lastDow', weekday: 6 });
  });

  it('parses 15W as weekday-nearest-to-day', () => {
    const expr = parse('0 0 12 15W * ?', { mode: 'quartz' });
    expect(expr.fields.dom).toEqual({ kind: 'weekdayNearest', day: 15 });
  });

  it('parses 5#3 as nth day-of-week', () => {
    const expr = parse('0 0 12 ? * 5#3', { mode: 'quartz' });
    expect(expr.fields.dow).toEqual({ kind: 'nthDow', weekday: 5, nth: 3 });
  });

  it('parses step on seconds', () => {
    const expr = parse('*/15 0 12 ? * MON', { mode: 'quartz' });
    expect(expr.fields.seconds).toEqual({
      kind: 'step',
      base: { kind: 'wildcard' },
      step: 15,
    });
  });

  it('produces frozen AST', () => {
    const expr = parse('0 0 12 ? * MON', { mode: 'quartz' });
    expect(Object.isFrozen(expr.fields)).toBe(true);
    expect(Object.isFrozen(expr.fields.dom)).toBe(true);
  });
});
