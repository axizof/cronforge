import { describe as describeTest, it, expect } from 'vitest';
import { parse } from '../../../src/parser/parse.js';
import { describe } from '../../../src/describer/describe.js';

describeTest('describe() - from a pre-parsed CronExpression (US2 scenario 5)', () => {
  it('accepts a CronExpression directly with the same output as a string input', () => {
    const expr = parse('* * * 6-8 *', { mode: 'standard' });
    const fromAst = describe(expr, { mode: 'standard', locale: 'en' });
    const fromString = describe('* * * 6-8 *', { mode: 'standard', locale: 'en' });
    expect(fromAst).toBe(fromString);
    expect(fromAst).toBe('Every minute, June through August');
  });

  it('works for Quartz expressions', () => {
    const expr = parse('0 0 12 ? * MON', { mode: 'quartz' });
    expect(describe(expr, { mode: 'quartz', locale: 'fr' })).toBe(
      'À 12h00, uniquement le lundi',
    );
  });
});
