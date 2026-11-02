import { describe as group, it, expect, vi } from 'vitest';
import { describe } from '../../../src/describer/describe.js';
import { registerLocale } from '../../../src/describer/register.js';
import type { LocaleData } from '../../../src/describer/locales/index.js';

const pirate: LocaleData = {
  meta: { code: 'pirate', name: 'Pirate', timeFormat: '24h' },
  atoms: { every_minute: 'arrr, every minute', at_time: 'at {{time}}, arrr' },
  months: {},
  weekdays: { '1': 'Moonday' },
  ordinals: { default: '' },
};

group('registerLocale()', () => {
  it('uses the registered atoms and falls back to English for missing ones', () => {
    registerLocale('pirate', pirate);
    expect(describe('* * * * *', { mode: 'standard', locale: 'pirate' })).toBe(
      'Arrr, every minute',
    );
    expect(describe('0 9 * * 1-2', { mode: 'standard', locale: 'pirate' })).toBe(
      'At 09:00, arrr, on Moonday and Tuesday',
    );
  });

  it('copies the data instead of freezing the caller object', () => {
    const data = structuredClone(pirate);
    registerLocale('pirate-copy', data);
    expect(Object.isFrozen(data.atoms)).toBe(false);
  });

  it('can replace a built-in locale', () => {
    registerLocale('it', { ...pirate, meta: { ...pirate.meta, code: 'it' } });
    expect(describe('* * * * *', { mode: 'standard', locale: 'it' })).toBe('Arrr, every minute');
  });
});

group('describe() - unknown locale', () => {
  it('falls back to English and reports it through onFallback', () => {
    const onFallback = vi.fn();
    const out = describe('* * * 6-8 *', { mode: 'standard', locale: 'jp', onFallback });
    expect(out).toBe('Every minute, June through August');
    expect(onFallback).toHaveBeenCalledWith('jp', 'en');
  });

  it('does not call onFallback for a registered locale', () => {
    const onFallback = vi.fn();
    describe('* * * * *', { mode: 'standard', locale: 'fr', onFallback });
    expect(onFallback).not.toHaveBeenCalled();
  });
});
