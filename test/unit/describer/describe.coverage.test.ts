import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';

describeTest('describer - coverage of less-common branches', () => {
  it('describes a single-value month', () => {
    expect(describe('0 0 1 6 *', { mode: 'standard', locale: 'en' })).toContain('in June');
  });

  it('describes a list of months', () => {
    expect(describe('0 0 1 1,6,12 *', { mode: 'standard', locale: 'en' })).toContain(
      'in January, June, December',
    );
  });

  it('describes a list of dom values', () => {
    expect(describe('0 12 1,15 * *', { mode: 'standard', locale: 'en' })).toContain('1st');
  });

  it('describes a Quartz year value', () => {
    const out = describe('0 0 12 1 6 ? 2026', { mode: 'quartz', locale: 'en' });
    expect(out).toContain('in 2026');
  });

  it('describes a Quartz year range', () => {
    const out = describe('0 0 12 1 6 ? 2026-2028', { mode: 'quartz', locale: 'en' });
    expect(out).toContain('in 2026-2028');
  });

  it('describes weekday-nearest-to (W)', () => {
    const out = describe('0 0 12 15W * ?', { mode: 'quartz', locale: 'en' });
    expect(out).toContain('weekday nearest');
  });

  it('describes last-day-offset (L-3)', () => {
    const out = describe('0 0 12 L-3 * ?', { mode: 'quartz', locale: 'en' });
    expect(out).toContain('to-last day');
  });

  it('describes last <weekday> of month (6L)', () => {
    const out = describe('0 0 12 ? * 6L', { mode: 'quartz', locale: 'en' });
    // Quartz dow 6 = Friday (SUN=1, MON=2, …, FRI=6).
    expect(out).toContain('last Friday');
  });

  it('describes a dow range like MON-FRI', () => {
    const out = describe('0 0 9 ? * MON-FRI', { mode: 'quartz', locale: 'en' });
    expect(out).toContain('from Monday through Friday');
  });

  it('describes a dow list like MON,WED,FRI', () => {
    const out = describe('0 9 * * MON,WED,FRI', { mode: 'standard', locale: 'en' });
    expect(out).toContain('Monday, Wednesday, Friday');
  });

  it('describes Quartz seconds step', () => {
    const out = describe('*/15 * * ? * *', { mode: 'quartz', locale: 'en' });
    expect(out).toContain('Every 15 seconds');
  });
});
