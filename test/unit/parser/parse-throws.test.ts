import { describe, it, expect } from 'vitest';
import { parse } from '../../../src/parser/parse.js';
import { CronError } from '../../../src/parser/errors.js';

describe('parse() - throws on invalid input', () => {
  it('throws CronError on empty input', () => {
    expect(() => parse('', { mode: 'standard' })).toThrow(CronError);
  });

  it('thrown CronError is also an instanceof Error', () => {
    try {
      parse('', { mode: 'standard' });
      throw new Error('expected parse() to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CronError);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('CronError carries a structured errors array', () => {
    try {
      parse('99 * * * *', { mode: 'standard' });
      throw new Error('expected parse() to throw');
    } catch (e) {
      if (!(e instanceof CronError)) throw e;
      expect(e.errors.length).toBeGreaterThan(0);
      expect(e.errors[0]?.code).toBe('value-out-of-range');
      expect(e.source).toBe('99 * * * *');
    }
  });

  it('throws on unknown macro', () => {
    expect(() => parse('@foo', { mode: 'standard' })).toThrow(CronError);
  });

  it('throws on wrong field count', () => {
    expect(() => parse('* *', { mode: 'standard' })).toThrow(CronError);
  });

  it('throws on inverted range', () => {
    expect(() => parse('30-10 * * * *', { mode: 'standard' })).toThrow(CronError);
  });

  it('throws on zero step', () => {
    expect(() => parse('*/0 * * * *', { mode: 'standard' })).toThrow(CronError);
  });

  it('throws on Quartz feature in standard mode', () => {
    expect(() => parse('? * * * *', { mode: 'standard' })).toThrow(CronError);
  });

  it('throws on macro in Quartz mode', () => {
    expect(() => parse('@daily', { mode: 'quartz' })).toThrow(CronError);
  });
});
