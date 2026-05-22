import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';

describeTest('describe() - Italian', () => {
  it('every 15 minutes', () => {
    expect(describe('*/15 * * * *', { mode: 'standard', locale: 'it' })).toBe(
      'Ogni 15 minuti, ogni giorno',
    );
  });

  it('every minute, June through August', () => {
    expect(describe('* * * 6-8 *', { mode: 'standard', locale: 'it' })).toBe(
      'Ogni minuto, da giugno a agosto',
    );
  });

  it('at 12:00 only on Monday (Quartz)', () => {
    expect(describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'it' })).toBe(
      'Alle 12:00, solo il lunedì',
    );
  });

  it('uses 24-hour clock', () => {
    expect(describe('0 14 * * *', { mode: 'standard', locale: 'it' })).toContain('14:00');
  });

  it('@daily macro renders the Italian shortcut', () => {
    expect(describe('@daily', { mode: 'standard', locale: 'it' })).toBe(
      'Ogni giorno a mezzanotte',
    );
  });

  it('last day of month renders in Italian', () => {
    expect(describe('0 0 12 L * ?', { mode: 'quartz', locale: 'it' })).toContain(
      "ultimo giorno del mese",
    );
  });

  it('weekday range renders in Italian', () => {
    const out = describe('0 0 9 ? * MON-FRI', { mode: 'quartz', locale: 'it' });
    expect(out).toContain('da lunedì a venerdì');
  });

  it('month value uses Italian month names', () => {
    expect(describe('0 0 1 7 *', { mode: 'standard', locale: 'it' })).toContain('luglio');
  });
});
