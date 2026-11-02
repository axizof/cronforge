import { describe, it, expect } from 'vitest';
import { nextOccurrences } from '../../../src/iterator/next-occurrences.js';
import { parse } from '../../../src/parser/parse.js';
import { CronError } from '../../../src/parser/errors.js';

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

  it('every minute -> 3 successive minutes ', () => {
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

  it('accepts a pre-parsed CronExpression', () => {
    const expr = parse('*/5 * * * *', { mode: 'standard' });
    expect(nextOccurrences(expr, 1, { mode: 'standard', startFrom: START })).toEqual([
      new Date('2026-06-01T10:05:00Z'),
    ]);
  });

  it.each<[string, () => unknown]>([
    [
      'reboot-not-iterable',
      () => nextOccurrences('@reboot', 1, { mode: 'standard', startFrom: START }),
    ],
    [
      'invalid-count',
      () => nextOccurrences('* * * * *', -1, { mode: 'standard', startFrom: START }),
    ],
    [
      'invalid-count',
      () => nextOccurrences('* * * * *', 1.5, { mode: 'standard', startFrom: START }),
    ],
    [
      'count-too-large',
      () => nextOccurrences('* * * * *', 100_001, { mode: 'standard', startFrom: START }),
    ],
    [
      'invalid-start-from',
      () => nextOccurrences('* * * * *', 1, { mode: 'standard', startFrom: new Date(NaN) }),
    ],
    [
      'invalid-start-from',
      () =>
        nextOccurrences('* * * * *', 1, {
          mode: 'standard',
          startFrom: '2026-01-01' as unknown as Date,
        }),
    ],
    [
      'invalid-timezone',
      () => nextOccurrences('* * * * *', 1, { mode: 'standard', timezone: 'Mars/Olympus' }),
    ],
    ['value-out-of-range', () => nextOccurrences('99 * * * *', 1, { mode: 'standard' })],
  ])('throws a CronError with code %s', (code, run) => {
    expect(run).toThrow(CronError);
    expect(run).toThrow(expect.objectContaining({ code }));
  });

  it('gives up quickly on an expression that never fires', () => {
    const started = Date.now();
    expect(() => nextOccurrences('0 0 31 2 *', 1, { mode: 'standard', startFrom: START })).toThrow(
      expect.objectContaining({ code: 'no-match-in-search-window' }),
    );
    expect(Date.now() - started).toBeLessThan(2000);
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
