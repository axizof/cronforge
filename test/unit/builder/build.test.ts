import { describe, it, expect } from 'vitest';
import { build, buildResult } from '../../../src/builder/build.js';
import { parse } from '../../../src/parser/parse.js';

describe('build() - per variant', () => {
  it('everyN minute -> */5 * * * *', () => {
    expect(build({ kind: 'everyN', unit: 'minute', n: 5 }, { mode: 'standard' })).toBe(
      '*/5 * * * *',
    );
  });

  it('everyN hour -> 0 */2 * * *', () => {
    expect(build({ kind: 'everyN', unit: 'hour', n: 2 }, { mode: 'standard' })).toBe(
      '0 */2 * * *',
    );
  });

  it('everyN day -> 0 0 */3 * *', () => {
    expect(build({ kind: 'everyN', unit: 'day', n: 3 }, { mode: 'standard' })).toBe(
      '0 0 */3 * *',
    );
  });

  it('at single time -> 30 14 * * *', () => {
    expect(
      build({ kind: 'at', times: [{ hour: 14, minute: 30 }] }, { mode: 'standard' }),
    ).toBe('30 14 * * *');
  });

  it('at multiple times -> 0,30 8,12,18 * * *', () => {
    expect(
      build(
        {
          kind: 'at',
          times: [
            { hour: 8, minute: 0 },
            { hour: 12, minute: 30 },
            { hour: 18, minute: 0 },
          ],
        },
        { mode: 'standard' },
      ),
    ).toBe('0,30,0 8,12,18 * * *');
  });

  it('daysOfWeek MON,WED,FRI at 09:00 -> 0 9 * * 1,3,5', () => {
    expect(
      build(
        { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } },
        { mode: 'standard' },
      ),
    ).toBe('0 9 * * 1,3,5');
  });

  it('daysOfMonth [1, 15] at 12:00 -> 0 12 1,15 * *', () => {
    expect(
      build(
        { kind: 'daysOfMonth', days: [1, 15], at: { hour: 12, minute: 0 } },
        { mode: 'standard' },
      ),
    ).toBe('0 12 1,15 * *');
  });

  it('hourRange 9-17 -> 0 9-17 * * *', () => {
    expect(
      build({ kind: 'hourRange', from: 9, to: 17 }, { mode: 'standard' }),
    ).toBe('0 9-17 * * *');
  });

  it('monthRange JUN-AUG -> * * * 6-8 *', () => {
    expect(
      build({ kind: 'monthRange', from: 'JUN', to: 'AUG' }, { mode: 'standard' }),
    ).toBe('* * * 6-8 *');
  });

  it('nthWeekdayOfMonth (Quartz) -> 0 0 14 ? * 4#3', () => {
    // 3rd Wednesday at 14:00. Quartz dow WED = 4.
    expect(
      build(
        {
          kind: 'nthWeekdayOfMonth',
          nth: 3,
          weekday: 'WED',
          at: { hour: 14, minute: 0 },
        },
        { mode: 'quartz' },
      ),
    ).toBe('0 0 14 ? * 4#3');
  });

  it('lastDayOfMonth at 23:59 (Quartz) -> 0 59 23 L * ?', () => {
    expect(
      build(
        { kind: 'lastDayOfMonth', at: { hour: 23, minute: 59 } },
        { mode: 'quartz' },
      ),
    ).toBe('0 59 23 L * ?');
  });

  it('lastWeekdayOfMonth FRI at 17:00 (Quartz) -> 0 0 17 ? * 6L', () => {
    expect(
      build(
        {
          kind: 'lastWeekdayOfMonth',
          weekday: 'FRI',
          at: { hour: 17, minute: 0 },
        },
        { mode: 'quartz' },
      ),
    ).toBe('0 0 17 ? * 6L');
  });

  it('weekdayNearestTo 15 at 12:00 (Quartz) -> 0 0 12 15W * ?', () => {
    expect(
      build(
        { kind: 'weekdayNearestTo', day: 15, at: { hour: 12, minute: 0 } },
        { mode: 'quartz' },
      ),
    ).toBe('0 0 12 15W * ?');
  });

  it('composite combines parts', () => {
    const result = build(
      {
        kind: 'composite',
        parts: [
          { kind: 'at', times: [{ hour: 8, minute: 0 }] },
          { kind: 'at', times: [{ hour: 18, minute: 0 }] },
        ],
      },
      { mode: 'standard' },
    );
    // Both parts -> minutes: list(0) = single 0; hours: list(8,18)
    expect(result).toBe('0 8,18 * * *');
  });
});

describe('build() - error paths', () => {
  function expectBuildErrorCode(
    fn: () => unknown,
    expectedCode: string,
  ): void {
    try {
      fn();
      throw new Error('expected build() to throw');
    } catch (e) {
      // build() throws a ParseError wrapping a BuildError.
      const code = (e as { code?: string }).code;
      expect(code).toBe(expectedCode);
    }
  }

  it('throws on Quartz-only variant in standard mode', () => {
    expectBuildErrorCode(
      () => build({ kind: 'lastDayOfMonth', at: { hour: 0, minute: 0 } }, { mode: 'standard' }),
      'mode-incompatibility',
    );
  });

  it('throws on empty list', () => {
    expectBuildErrorCode(
      () => build({ kind: 'at', times: [] }, { mode: 'standard' }),
      'empty-list',
    );
  });

  it('throws on out-of-range time', () => {
    expectBuildErrorCode(
      () => build({ kind: 'at', times: [{ hour: 25, minute: 0 }] }, { mode: 'standard' }),
      'out-of-range',
    );
  });

  it('throws on empty composite', () => {
    expectBuildErrorCode(
      () => build({ kind: 'composite', parts: [] }, { mode: 'standard' }),
      'composite-empty',
    );
  });

  it('seconds in standard mode rejected', () => {
    expectBuildErrorCode(
      () =>
        build(
          { kind: 'at', times: [{ hour: 12, minute: 0, second: 30 }] },
          { mode: 'standard' },
        ),
      'mode-incompatibility',
    );
  });
});

describe('buildResult() - never throws', () => {
  it('returns ok for a valid input', () => {
    const r = buildResult({ kind: 'everyN', unit: 'minute', n: 10 }, { mode: 'standard' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value).toBe('*/10 * * * *');
  });

  it('returns err with mode-incompatibility', () => {
    const r = buildResult(
      { kind: 'lastDayOfMonth', at: { hour: 0, minute: 0 } },
      { mode: 'standard' },
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.code).toBe('mode-incompatibility');
  });
});

describe('build() round-trip property', () => {
  const cases = [
    [{ kind: 'everyN', unit: 'minute', n: 5 } as const, 'standard'] as const,
    [
      { kind: 'at', times: [{ hour: 9, minute: 0 }, { hour: 17, minute: 0 }] } as const,
      'standard',
    ] as const,
    [
      { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } } as const,
      'standard',
    ] as const,
    [
      { kind: 'lastDayOfMonth', at: { hour: 23, minute: 59 } } as const,
      'quartz',
    ] as const,
    [
      {
        kind: 'nthWeekdayOfMonth',
        nth: 3,
        weekday: 'WED',
        at: { hour: 14, minute: 0 },
      } as const,
      'quartz',
    ] as const,
  ];

  for (const [input, mode] of cases) {
    it(`${input.kind} (${mode}) round-trips through parse`, () => {
      const s = build(input, { mode });
      // Will throw if parse fails.
      expect(() => parse(s, { mode })).not.toThrow();
    });
  }
});
