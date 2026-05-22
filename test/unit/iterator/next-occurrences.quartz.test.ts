import { describe, it, expect } from 'vitest';
import { nextOccurrences } from '../../../src/iterator/next-occurrences.js';

describe('nextOccurrences - Quartz mode', () => {
  it('honours seconds precision (FR-018)', () => {
    const r = nextOccurrences('30 0 12 * * ?', 1, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    expect(r[0]?.toISOString()).toBe('2026-06-01T12:00:30.000Z');
  });

  it('every 15 seconds', () => {
    const r = nextOccurrences('*/15 * * ? * *', 3, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    expect(r.map((d) => d.toISOString())).toEqual([
      '2026-06-01T00:00:15.000Z',
      '2026-06-01T00:00:30.000Z',
      '2026-06-01T00:00:45.000Z',
    ]);
  });

  it('Quartz MON (dow=2) fires on Mondays (US3 scenario 2)', () => {
    // 2026-05-31 is a Sunday; next Monday is 2026-06-01 at 12:00:00.
    const r = nextOccurrences('0 0 12 ? * MON', 2, {
      mode: 'quartz',
      startFrom: new Date('2026-05-31T00:00:00Z'),
      timezone: 'UTC',
    });
    expect(r[0]?.toISOString()).toBe('2026-06-01T12:00:00.000Z');
    expect(r[1]?.toISOString()).toBe('2026-06-08T12:00:00.000Z');
  });

  it('Quartz L (last day of month)', () => {
    const r = nextOccurrences('0 0 12 L * ?', 2, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    expect(r[0]?.toISOString()).toBe('2026-06-30T12:00:00.000Z');
    expect(r[1]?.toISOString()).toBe('2026-07-31T12:00:00.000Z');
  });

  it('Quartz L-3 (3rd-to-last day)', () => {
    const r = nextOccurrences('0 0 12 L-3 * ?', 1, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    // June has 30 days. 3 to last = day 27.
    expect(r[0]?.toISOString()).toBe('2026-06-27T12:00:00.000Z');
  });

  it('Quartz 5#3 (3rd Thursday of month)', () => {
    // Quartz dow 5 = Thursday (SUN=1, MON=2, ..., THU=5).
    const r = nextOccurrences('0 0 12 ? * 5#3', 1, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    // 3rd Thursday of June 2026: Thursdays are 4, 11, 18, 25 -> 3rd = 18.
    expect(r[0]?.toISOString()).toBe('2026-06-18T12:00:00.000Z');
  });

  it('Quartz 6L (last Friday of month)', () => {
    // Quartz dow 6 = Friday.
    const r = nextOccurrences('0 0 12 ? * 6L', 1, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    // Last Friday of June 2026: Fridays are 5, 12, 19, 26 -> last = 26.
    expect(r[0]?.toISOString()).toBe('2026-06-26T12:00:00.000Z');
  });

  it('Quartz 15W (weekday nearest the 15th)', () => {
    // 2026-06-15 is a Monday -> fires on the 15th.
    const r = nextOccurrences('0 0 12 15W * ?', 1, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    expect(r[0]?.toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });

  it('Quartz with year field', () => {
    const r = nextOccurrences('0 0 12 1 1 ? 2027', 1, {
      mode: 'quartz',
      startFrom: new Date('2026-06-01T00:00:00Z'),
      timezone: 'UTC',
    });
    expect(r[0]?.toISOString()).toBe('2027-01-01T12:00:00.000Z');
  });
});
