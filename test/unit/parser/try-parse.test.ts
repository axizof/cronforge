import { describe, it, expect } from 'vitest';
import { tryParse } from '../../../src/parser/parse.js';
import { CronError } from '../../../src/parser/errors.js';

describe('tryParse()', () => {
  it('returns ok for a valid expression', () => {
    const r = tryParse('* * * * *', { mode: 'standard' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.dialect).toBe('standard');
  });

  it('returns err for empty input - never throws', () => {
    const r = tryParse('', { mode: 'standard' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error).toBeInstanceOf(CronError);
    expect(r.error.code).toBe('empty-input');
  });

  it('returns err for whitespace-only input - never throws', () => {
    const r = tryParse('   \t  ', { mode: 'standard' });
    expect(r.ok).toBe(false);
  });

  it('returns err for an unknown macro - never throws', () => {
    const r = tryParse('@foo', { mode: 'standard' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.code).toBe('unknown-macro');
  });

  it('returns err for wrong field count - never throws', () => {
    const r = tryParse('* * *', { mode: 'standard' });
    expect(r.ok).toBe(false);
  });

  it('returns err for an out-of-range value - never throws', () => {
    const r = tryParse('99 * * * *', { mode: 'standard' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors[0]?.code).toBe('value-out-of-range');
  });

  it('returns err for a 50-KB pathological string - never throws', () => {
    const r = tryParse('x'.repeat(50_000), { mode: 'standard' });
    expect(r.ok).toBe(false);
  });

  it('returns err for non-string input - never throws', () => {
    // @ts-expect-error testing runtime guard against bad input
    const r = tryParse(null, { mode: 'standard' });
    expect(r.ok).toBe(false);
  });

  it('returns err for a Quartz-only feature in standard mode', () => {
    const r = tryParse('0 0 12 ? * MON', { mode: 'standard' });
    expect(r.ok).toBe(false);
  });
});
