import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';

describeTest('describe() - German', () => {
  it('every 15 minutes', () => {
    expect(describe('*/15 * * * *', { mode: 'standard', locale: 'de' })).toBe(
      'Alle 15 Minuten, jeden Tag',
    );
  });

  it('every minute, June through August', () => {
    expect(describe('* * * 6-8 *', { mode: 'standard', locale: 'de' })).toBe(
      'Jede Minute, Juni bis August',
    );
  });

  it('at 12:00 only on Monday (Quartz)', () => {
    expect(describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'de' })).toBe(
      'Um 12:00, nur am Montag',
    );
  });

  it('uses 24-hour clock', () => {
    expect(describe('0 14 * * *', { mode: 'standard', locale: 'de' })).toContain('14:00');
  });

  it('@daily macro renders the German shortcut', () => {
    expect(describe('@daily', { mode: 'standard', locale: 'de' })).toBe(
      'Jeden Tag um Mitternacht',
    );
  });

  it('last day of month renders in German', () => {
    expect(describe('0 0 12 L * ?', { mode: 'quartz', locale: 'de' })).toContain(
      'letzten Tag des Monats',
    );
  });

  it('weekday range renders in German', () => {
    const out = describe('0 0 9 ? * MON-FRI', { mode: 'quartz', locale: 'de' });
    expect(out).toContain('von Montag bis Freitag');
  });

  it('month range uses German month names', () => {
    expect(describe('* * * 12-12 *', { mode: 'standard', locale: 'de' })).toContain('Dezember');
  });

  it('weekday list renders in German', () => {
    const out = describe('0 9 * * MON,WED,FRI', { mode: 'standard', locale: 'de' });
    expect(out).toContain('Montag, Mittwoch, Freitag');
  });
});
