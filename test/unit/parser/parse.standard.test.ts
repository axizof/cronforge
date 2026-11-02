import { describe, it, expect } from 'vitest';
import { parse, tryParse } from '../../../src/parser/parse.js';

describe('parse() - standard mode', () => {
  it('parses the all-wildcard expression', () => {
    const expr = parse('* * * * *', { mode: 'standard' });
    expect(expr.dialect).toBe('standard');
    expect(expr.fields.minute).toEqual({ kind: 'wildcard' });
    expect(expr.fields.dow).toEqual({ kind: 'wildcard' });
    expect(expr.fields.seconds).toBeUndefined();
    expect(expr.fields.year).toBeUndefined();
    expect(expr.macro).toBeNull();
  });

  it('parses literal values', () => {
    const expr = parse('5 10 15 6 3', { mode: 'standard' });
    expect(expr.fields.minute).toEqual({ kind: 'value', value: 5 });
    expect(expr.fields.hour).toEqual({ kind: 'value', value: 10 });
    expect(expr.fields.dom).toEqual({ kind: 'value', value: 15 });
    expect(expr.fields.month).toEqual({ kind: 'value', value: 6 });
    expect(expr.fields.dow).toEqual({ kind: 'value', value: 3 });
  });

  it('parses ranges', () => {
    const expr = parse('* * * 6-8 *', { mode: 'standard' });
    expect(expr.fields.month).toEqual({ kind: 'range', from: 6, to: 8 });
  });

  it('parses step on wildcard', () => {
    const expr = parse('*/5 * * * *', { mode: 'standard' });
    expect(expr.fields.minute).toEqual({
      kind: 'step',
      base: { kind: 'wildcard' },
      step: 5,
    });
  });

  it('parses step on range', () => {
    const expr = parse('0-30/10 * * * *', { mode: 'standard' });
    expect(expr.fields.minute).toEqual({
      kind: 'step',
      base: { kind: 'range', from: 0, to: 30 },
      step: 10,
    });
  });

  it('parses comma-separated lists', () => {
    const expr = parse('1,5,15 * * * *', { mode: 'standard' });
    expect(expr.fields.minute.kind).toBe('list');
    if (expr.fields.minute.kind !== 'list') throw new Error('unreachable');
    expect(expr.fields.minute.members).toHaveLength(3);
    expect(expr.fields.minute.members[0]).toEqual({ kind: 'value', value: 1 });
  });

  it('accepts month mnemonics (case-insensitive)', () => {
    const expr = parse('* * * jan-mar *', { mode: 'standard' });
    expect(expr.fields.month).toEqual({ kind: 'range', from: 1, to: 3 });
  });

  it('accepts weekday mnemonics with standard numbering (SUN=0)', () => {
    const expr = parse('* * * * SUN', { mode: 'standard' });
    expect(expr.fields.dow).toEqual({ kind: 'value', value: 0 });
    const sat = parse('* * * * SAT', { mode: 'standard' });
    expect(sat.fields.dow).toEqual({ kind: 'value', value: 6 });
  });

  it('expands @daily macro', () => {
    const expr = parse('@daily', { mode: 'standard' });
    expect(expr.macro).toBe('@daily');
    expect(expr.fields.minute).toEqual({ kind: 'value', value: 0 });
    expect(expr.fields.hour).toEqual({ kind: 'value', value: 0 });
    expect(expr.fields.dom).toEqual({ kind: 'wildcard' });
    expect(expr.dialect).toBe('standard');
  });

  it('expands all schedule macros', () => {
    const cases: ReadonlyArray<
      [
        '@hourly' | '@daily' | '@midnight' | '@weekly' | '@monthly' | '@yearly' | '@annually',
        number,
        number,
      ]
    > = [
      ['@hourly', 0, -1],
      ['@daily', 0, 0],
      ['@midnight', 0, 0],
      ['@weekly', 0, 0],
      ['@monthly', 0, 0],
      ['@yearly', 0, 0],
      ['@annually', 0, 0],
    ];
    for (const [macro, minute] of cases) {
      const expr = parse(macro, { mode: 'standard' });
      expect(expr.macro).toBe(macro);
      expect(expr.fields.minute).toEqual({ kind: 'value', value: minute });
    }
  });

  it('parses @reboot and flags it as non-iterable', () => {
    const expr = parse('@reboot', { mode: 'standard' });
    expect(expr.macro).toBe('@reboot');
    expect(expr.hasReboot).toBe(true);
  });

  it('returns frozen AST nodes', () => {
    const expr = parse('* * * * *', { mode: 'standard' });
    expect(Object.isFrozen(expr)).toBe(true);
    expect(Object.isFrozen(expr.fields)).toBe(true);
    expect(Object.isFrozen(expr.fields.minute)).toBe(true);
  });

  it('accepts 7 as Sunday in day-of-week', () => {
    expect(parse('0 0 * * 7', { mode: 'standard' }).fields.dow).toEqual({
      kind: 'value',
      value: 7,
    });
  });

  it('rejects the Quartz-only V/N step form', () => {
    const r = tryParse('5/15 * * * *', { mode: 'standard' });
    expect(r.ok ? [] : r.error.errors.map((e) => e.code)).toEqual(['step-base-invalid']);
  });
});
