import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';

describeTest('describe() - Spanish', () => {
  it('every 15 minutes', () => {
    expect(describe('*/15 * * * *', { mode: 'standard', locale: 'es' })).toBe(
      'Cada 15 minutos, todos los días',
    );
  });

  it('every minute, June through August', () => {
    expect(describe('* * * 6-8 *', { mode: 'standard', locale: 'es' })).toBe(
      'Cada minuto, de junio a agosto',
    );
  });

  it('at 12:00 every Monday (Quartz)', () => {
    expect(describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'es' })).toBe(
      'A las 12:00, solo el lunes',
    );
  });

  it('uses 24-hour clock', () => {
    expect(describe('0 14 * * *', { mode: 'standard', locale: 'es' })).toContain('14:00');
  });

  it('@daily macro renders the Spanish shortcut', () => {
    expect(describe('@daily', { mode: 'standard', locale: 'es' })).toBe(
      'Todos los días, a medianoche',
    );
  });

  it('last day of month renders in Spanish', () => {
    expect(describe('0 0 12 L * ?', { mode: 'quartz', locale: 'es' })).toContain(
      'último día del mes',
    );
  });

  it('weekday range renders in Spanish', () => {
    const out = describe('0 0 9 ? * MON-FRI', { mode: 'quartz', locale: 'es' });
    expect(out).toContain('de lunes a viernes');
  });

  it('weekday list renders in Spanish', () => {
    const out = describe('0 9 * * MON,WED,FRI', { mode: 'standard', locale: 'es' });
    expect(out).toContain('lunes, miércoles, viernes');
  });

  it('month value renders in Spanish', () => {
    expect(describe('0 0 1 7 *', { mode: 'standard', locale: 'es' })).toContain('en julio');
  });
});
