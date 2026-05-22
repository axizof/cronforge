import { describe, it, expect } from 'vitest';
import { nextOccurrences } from '../../src/iterator/next-occurrences.js';

describe('iterator - DST behaviour in Europe/Paris', () => {
  // Spring-forward 2026: 2026-03-29 02:00 -> 03:00 (the 02:30 wall-clock
  // does not exist).
  it('spring-forward gap: an expression at 02:30 fires at 03:00 (next valid)', () => {
    // Compute the next fire of "every day at 02:30" starting from before
    // the gap. On 2026-03-29 the local 02:30 does not exist; the
    // iterator should advance to the next valid instant matching the
    // expression - which is 2026-03-30 02:30 local time.
    const r = nextOccurrences('30 2 * * *', 1, {
      mode: 'standard',
      startFrom: new Date('2026-03-29T00:00:00Z'), // 01:00 Paris local
      timezone: 'Europe/Paris',
    });
    const expected = '2026-03-30T00:30:00.000Z'; // 02:30 Paris local on the 30th
    expect(r[0]?.toISOString()).toBe(expected);
  });

  // Fall-back 2026: 2026-10-25 03:00 -> 02:00 (02:30 wall-clock exists
  // twice). The iterator MUST fire ONCE at the FIRST instance.
  it('fall-back overlap: an expression at 02:30 fires once at the first instance', () => {
    const r = nextOccurrences('30 2 * * *', 2, {
      mode: 'standard',
      startFrom: new Date('2026-10-24T22:00:00Z'), // 00:00 Paris local on the 25th
      timezone: 'Europe/Paris',
    });
    expect(r).toHaveLength(2);
    // The first occurrence MUST be at the FIRST 02:30 - i.e. before the
    // clocks rolled back. With CEST (UTC+2) still in effect, that is
    // 00:30 UTC on Oct 25.
    expect(r[0]?.toISOString()).toBe('2026-10-25T00:30:00.000Z');
    // The second occurrence is the next day's 02:30 (CET, UTC+1).
    expect(r[1]?.toISOString()).toBe('2026-10-26T01:30:00.000Z');
  });

  it('computes consecutive occurrences across a DST transition cleanly', () => {
    // 0 12 * * * - every day at 12:00 Paris local. Crossing the spring
    // transition should not skip any noon.
    const r = nextOccurrences('0 12 * * *', 3, {
      mode: 'standard',
      startFrom: new Date('2026-03-28T11:00:00Z'), // 12:00 Paris local on the 28th
      timezone: 'Europe/Paris',
    });
    // Next 3 noons:
    //   2026-03-29 12:00 Paris (CEST after spring) = 10:00 UTC
    //   2026-03-30 12:00 Paris (CEST)              = 10:00 UTC
    //   2026-03-31 12:00 Paris (CEST)              = 10:00 UTC
    expect(r[0]?.toISOString()).toBe('2026-03-29T10:00:00.000Z');
    expect(r[1]?.toISOString()).toBe('2026-03-30T10:00:00.000Z');
    expect(r[2]?.toISOString()).toBe('2026-03-31T10:00:00.000Z');
  });
});

describe('iterator - UTC sanity check', () => {
  it('every minute in UTC produces sequential UTC minutes', () => {
    const r = nextOccurrences('* * * * *', 5, {
      mode: 'standard',
      startFrom: new Date('2026-06-01T10:00:00Z'),
      timezone: 'UTC',
    });
    for (let i = 0; i < 5; i++) {
      const expected = new Date('2026-06-01T10:00:00Z').getTime() + (i + 1) * 60_000;
      expect(r[i]?.getTime()).toBe(expected);
    }
  });
});
