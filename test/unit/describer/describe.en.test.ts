import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';

describeTest('describe() - English', () => {
  // US2 acceptance scenario 1
  it('* * * 6-8 * standard -> "Every minute, June through August"', () => {
    expect(describe('* * * 6-8 *', { mode: 'standard', locale: 'en' })).toBe(
      'Every minute, June through August',
    );
  });

  // US2 acceptance scenario 3
  it('0 0 12 * * ? quartz -> "At 12:00 PM every day"', () => {
    expect(describe('0 0 12 * * ?', { mode: 'quartz', locale: 'en' })).toBe(
      'At 12:00 PM every day',
    );
  });

  it('every minute', () => {
    expect(describe('* * * * *', { mode: 'standard', locale: 'en' })).toBe(
      'Every minute, every day',
    );
  });

  it('every 5 minutes', () => {
    expect(describe('*/5 * * * *', { mode: 'standard', locale: 'en' })).toBe(
      'Every 5 minutes, every day',
    );
  });

  it('every hour', () => {
    expect(describe('0 * * * *', { mode: 'standard', locale: 'en' })).toBe(
      'Every hour, every day',
    );
  });

  it('every 2 hours', () => {
    expect(describe('0 */2 * * *', { mode: 'standard', locale: 'en' })).toBe(
      'Every 2 hours, every day',
    );
  });

  it('renders 12-hour clock with PM', () => {
    expect(describe('0 14 * * *', { mode: 'standard', locale: 'en' })).toContain('2:00 PM');
  });

  it('renders 12-hour clock with AM at midnight', () => {
    expect(describe('30 0 * * *', { mode: 'standard', locale: 'en' })).toContain('12:30 AM');
  });

  it('renders Quartz weekday with Quartz numbering', () => {
    // MON = 2 in Quartz
    const out = describe('0 0 12 ? * MON', { mode: 'quartz', locale: 'en' });
    expect(out).toBe('At 12:00 PM, only on Monday');
  });

  it('renders @daily macro shortcut', () => {
    expect(describe('@daily', { mode: 'standard', locale: 'en' })).toBe(
      'Every day, at midnight',
    );
  });

  it('renders last day of month', () => {
    expect(describe('0 0 12 L * ?', { mode: 'quartz', locale: 'en' })).toContain(
      'last day of the month',
    );
  });

  it('renders nth weekday', () => {
    const out = describe('0 0 12 ? * 5#3', { mode: 'quartz', locale: 'en' });
    expect(out).toContain('3rd');
    expect(out).toContain('Thursday'); // Quartz dow 5 = Thursday (SUN=1, MON=2, ...)
  });
});
