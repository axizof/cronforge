import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';

describeTest('describe() - French', () => {
  // US2 acceptance scenario 2
  it('* * * 6-8 * standard -> "Toutes les minutes, de juin à août"', () => {
    expect(describe('* * * 6-8 *', { mode: 'standard', locale: 'fr' })).toBe(
      'Toutes les minutes, de juin à août',
    );
  });

  // US2 acceptance scenario 4
  it('0 0 12 ? * MON quartz -> "À 12h00, uniquement le lundi"', () => {
    expect(describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'fr' })).toBe(
      'À 12h00, uniquement le lundi',
    );
  });

  it('rendering uses 24-hour clock', () => {
    expect(describe('0 14 * * *', { mode: 'standard', locale: 'fr' })).toContain('14h00');
  });

  it('renders "toutes les minutes"', () => {
    expect(describe('* * * * *', { mode: 'standard', locale: 'fr' })).toBe(
      'Toutes les minutes, tous les jours',
    );
  });

  it('renders "toutes les 5 minutes"', () => {
    expect(describe('*/5 * * * *', { mode: 'standard', locale: 'fr' })).toBe(
      'Toutes les 5 minutes, tous les jours',
    );
  });

  it('renders day-of-month with 1er ordinal', () => {
    const out = describe('0 12 1 * *', { mode: 'standard', locale: 'fr' });
    expect(out).toContain('1er du mois');
  });

  it('renders @daily macro shortcut', () => {
    expect(describe('@daily', { mode: 'standard', locale: 'fr' })).toBe(
      'Tous les jours, à minuit',
    );
  });

  it('renders last day of month in French', () => {
    expect(describe('0 0 12 L * ?', { mode: 'quartz', locale: 'fr' })).toContain(
      'dernier jour du mois',
    );
  });
});
