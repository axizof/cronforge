import { describe, it, expect } from 'vitest';
import { parse, tryParse } from '../../../src/parser/parse.js';
import { detectDialect } from '../../../src/ast/dialect.js';

describe('mode: "auto" resolution', () => {
  it('resolves a 5-field expression with no Quartz chars to standard', () => {
    expect(detectDialect(['*', '*', '*', '6-8', '*'])).toBe('standard');
    const expr = parse('* * * 6-8 *', { mode: 'auto' });
    expect(expr.dialect).toBe('standard');
  });

  it('resolves a 6-field expression to Quartz', () => {
    expect(detectDialect(['0', '0', '12', '?', '*', 'MON'])).toBe('quartz');
    const expr = parse('0 0 12 ? * MON', { mode: 'auto' });
    expect(expr.dialect).toBe('quartz');
  });

  it('resolves a 7-field expression to Quartz', () => {
    expect(detectDialect(['0', '0', '12', '1', '6', '?', '2026'])).toBe('quartz');
    const expr = parse('0 0 12 1 6 ? 2026', { mode: 'auto' });
    expect(expr.dialect).toBe('quartz');
  });

  it('rejects a 5-field expression with Quartz-only characters', () => {
    expect(detectDialect(['?', '*', '*', '*', '*'])).toBeNull();
    const r = tryParse('? * * * *', { mode: 'auto' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.code).toBe('auto-detect-failed');
  });

  it('rejects field counts outside {5, 6, 7}', () => {
    expect(detectDialect(['*'])).toBeNull();
    expect(detectDialect(['*', '*', '*', '*'])).toBeNull();
    expect(detectDialect(new Array(8).fill('*'))).toBeNull();
  });
});
