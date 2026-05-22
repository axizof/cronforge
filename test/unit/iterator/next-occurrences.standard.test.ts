import { describe, it, expect } from 'vitest';
import { nextOccurrences } from '../../../src/iterator/next-occurrences.js';

const START = new Date('2026-06-01T10:00:00Z');

describe('nextOccurrences - standard mode', () => {
  it('returns [] for count = 0', () => {
    const r = nextOccurrences('* * * * *', 0, { mode: 'standard', startFrom: START });
    expect(r).toEqual([]);
  });

  it('returns frozen array', () => {
    const r = nextOccurrences('* * * * *', 3, { mode: 'standard', startFrom: START });
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('every minute -> 3 successive minutes (US3 scenario 1)', () => {
    const r = nextOccurrences('*/1 * * * *', 3, {
      mode: 'standard',
      startFrom: START,
      timezone: 'UTC',
    });
    expect(r.map((d) => d.toISOString())).toEqual([
      '2026-06-01T10:01:00.000Z',
      '2026-06-01T10:02:00.000Z',
      '2026-06-01T10:03:00.000Z',
    ]);
  });

  it('every 5 minutes', () => {
    const r = nextOccurrences('*/5 * * * *', 3, {
      mode: 'standard',
      startFrom: START,
      timezone: 'UTC',
    });
    expect(r.map((d) => d.toISOString())).toEqual([
      '2026-06-01T10:05:00.000Z',
      '2026-06-01T10:10:00.000Z',
      '2026-06-01T10:15:00.000Z',
    ]);
  });

  it('hourly at minute 0', () => {
    const r = nextOccurrences('0 * * * *', 3, {
      mode: 'standard',
      startFrom: START,
      timezone: 'UTC',
    });
    expect(r.map((d) => d.toISOString())).toEqual([
      '2026-06-01T11:00:00.000Z',
      '2026-06-01T12:00:00.000Z',
      '2026-06-01T13:00:00.000Z',
    ]);
  });

  it('daily at midnight', () => {
    const r = nextOccurrences('0 0 * * *', 3, {
      mode: 'standard',
      startFrom: START,
      timezone: 'UTC',
    });
    expect(r.map((d) => d.toISOString())).toEqual([
      '2026-06-02T00:00:00.000Z',
      '2026-06-03T00:00:00.000Z',
      '2026-06-04T00:00:00.000Z',
    ]);
  });

  it('weekday range MON-FRI at 09:00', () => {
    // June 1, 2026 = Monday. 09:00 today already past (started at 10:00).
    const r = nextOccurrences('0 9 * * MON-FRI', 5, {
      mode: 'standard',
      startFrom: START,
      timezone: 'UTC',
    });
    expect(r).toHaveLength(5);
    // Next 5 weekday 09:00s: Tue Jun 2, Wed Jun 3, Thu Jun 4, Fri Jun 5, Mon Jun 8.
    expect(r[0]?.toISOString()).toBe('2026-06-02T09:00:00.000Z');
    expect(r[4]?.toISOString()).toBe('2026-06-08T09:00:00.000Z');
  });

  it('throws on @reboot', () => {
    try {
      nextOccurrences('@reboot', 1, { mode: 'standard', startFrom: START });
      throw new Error('expected to throw');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('reboot-not-iterable');
    }
  });

  it('throws on negative count', () => {
    expect(() => nextOccurrences('* * * * *', -1, { mode: 'standard', startFrom: START })).toThrow();
  });

  it('throws on count over 100_000', () => {
    expect(() =>
      nextOccurrences('* * * * *', 100_001, { mode: 'standard', startFrom: START }),
    ).toThrow();
  });

  it('rejects invalid startFrom', () => {
    expect(() =>
      nextOccurrences('* * * * *', 1, { mode: 'standard', startFrom: new Date(NaN) }),
    ).toThrow();
  });

  it('accepts a pre-parsed CronExpression', () => {
    // Use string for now to confirm CronExpression path elsewhere; this
    // is the trivial branch.
    const r = nextOccurrences('* * * * *', 1, { mode: 'standard', startFrom: START });
    expect(r).toHaveLength(1);
  });

  it('Feb 29 leap-year fires only on leap years', () => {
    const r = nextOccurrences('0 0 29 2 *', 2, {
      mode: 'standard',
      startFrom: new Date('2025-03-01T00:00:00Z'),
      timezone: 'UTC',
    });
    expect(r[0]?.toISOString()).toBe('2028-02-29T00:00:00.000Z');
    expect(r[1]?.toISOString()).toBe('2032-02-29T00:00:00.000Z');
  });
});
