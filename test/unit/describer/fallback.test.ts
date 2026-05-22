import { describe as describeTest, it, expect, vi } from 'vitest';
import { describe } from '../../../src/describer/describe.js';

describeTest('describe() - locale fallback', () => {
  it('falls back to English for an unregistered locale', () => {
    const out = describe('* * * 6-8 *', { mode: 'standard', locale: 'jp' });
    expect(out).toBe('Every minute, June through August');
  });

  it('invokes onFallback with requested and used locale', () => {
    const spy = vi.fn<(requested: string, used: string) => void>();
    describe('* * * * *', { mode: 'standard', locale: 'jp', onFallback: spy });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('jp', 'en');
  });

  it('does NOT invoke onFallback when the requested locale is registered', () => {
    const spy = vi.fn<(requested: string, used: string) => void>();
    describe('* * * * *', { mode: 'standard', locale: 'en', onFallback: spy });
    expect(spy).not.toHaveBeenCalled();
  });
});
