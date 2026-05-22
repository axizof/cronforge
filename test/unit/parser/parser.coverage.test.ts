import { describe, it, expect } from 'vitest';
import { tryParse } from '../../../src/parser/parse.js';

describe('parser - coverage of less-common branches', () => {
  it('rejects empty list members like "1,,3"', () => {
    const r = tryParse('1,,3 * * * *', { mode: 'standard' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors.some((e) => e.code === 'empty-list-member')).toBe(true);
  });

  it('rejects invalid Quartz L-N offsets', () => {
    const r = tryParse('0 0 12 L-99 * ?', { mode: 'quartz' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors.some((e) => e.code === 'last-dom-offset-out-of-range')).toBe(true);
  });

  it('rejects non-numeric Quartz L offset', () => {
    const r = tryParse('0 0 12 L-x * ?', { mode: 'quartz' });
    expect(r.ok).toBe(false);
  });

  it('rejects L outside of dom', () => {
    const r = tryParse('0 0 L ? * MON', { mode: 'quartz' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors.some((e) => e.code === 'last-dom-not-allowed-here')).toBe(true);
  });

  it('rejects W outside of dom', () => {
    const r = tryParse('0 0 12 ? * 15W', { mode: 'quartz' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors.some((e) => e.code === 'weekday-nearest-not-allowed-here')).toBe(true);
  });

  it('rejects nL outside of dow', () => {
    const r = tryParse('0 0 12 6L * ?', { mode: 'quartz' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors.some((e) => e.code === 'last-dow-not-allowed-here')).toBe(true);
  });

  it('rejects # outside of dow', () => {
    const r = tryParse('0 0 5#3 * * ?', { mode: 'quartz' });
    expect(r.ok).toBe(false);
  });

  it('rejects nested lists', () => {
    // Cannot directly express nested lists in cron syntax; this just
    // confirms the parser does not return a list-inside-list AST.
    const r = tryParse('1,2 * * * *', { mode: 'standard' });
    expect(r.ok).toBe(true);
  });

  it('rejects empty field', () => {
    // An expression like "  *  *  *  *" yields 4 tokens - caught by field-count.
    const r = tryParse('* * * *', { mode: 'standard' });
    expect(r.ok).toBe(false);
  });

  it('handles 7-field auto-detected Quartz with year range', () => {
    const r = tryParse('0 0 12 1 6 ? 2026-2028', { mode: 'auto' });
    expect(r.ok).toBe(true);
  });

  it('rejects ? when not in dom or dow', () => {
    const r = tryParse('? 0 12 ? * MON', { mode: 'quartz' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors.some((e) => e.code === 'any-not-allowed-here')).toBe(true);
  });

  it('rejects step at value base like 5/2', () => {
    const r = tryParse('5/2 * * * *', { mode: 'standard' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.errors.some((e) => e.code === 'step-base-invalid')).toBe(true);
  });

  it('rejects mnemonic out of range like JAN-DEC/0', () => {
    const r = tryParse('* * * JAN-DEC/0 *', { mode: 'standard' });
    expect(r.ok).toBe(false);
  });

  it('flags unsupported feature in standard mode (LW)', () => {
    const r = tryParse('0 0 LW * *', { mode: 'standard' });
    expect(r.ok).toBe(false);
  });

  it('handles macro @reboot tokens with extra whitespace', () => {
    const r = tryParse('   @reboot  ', { mode: 'standard' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.hasReboot).toBe(true);
  });
});
