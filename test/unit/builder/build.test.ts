import { describe, it, expect } from 'vitest';
import { build, buildResult } from '../../../src/builder/build.js';
import type { CronBuilderInput } from '../../../src/builder/input.js';
import { CronError } from '../../../src/parser/errors.js';
import { validate } from '../../../src/validator/validate.js';

const at9 = { hour: 9, minute: 0 };

describe('build() - standard mode', () => {
  it.each<[CronBuilderInput, string]>([
    [{ kind: 'everyN', unit: 'minute', n: 5 }, '*/5 * * * *'],
    [{ kind: 'everyN', unit: 'hour', n: 2 }, '0 */2 * * *'],
    [{ kind: 'everyN', unit: 'day', n: 3 }, '0 0 */3 * *'],
    [{ kind: 'everyN', unit: 'month', n: 6 }, '0 0 1 */6 *'],
    [{ kind: 'everyN', unit: 'year', n: 1 }, '0 0 1 1 *'],
    [{ kind: 'at', times: [{ hour: 14, minute: 30 }] }, '30 14 * * *'],
    [{ kind: 'at', times: [{ hour: 17, minute: 0 }, at9] }, '0 9,17 * * *'],
    [
      {
        kind: 'at',
        times: [at9, { hour: 9, minute: 30 }, { hour: 17, minute: 0 }, { hour: 17, minute: 30 }],
      },
      '0,30 9,17 * * *',
    ],
    [{ kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: at9 }, '0 9 * * 1,3,5'],
    [{ kind: 'daysOfWeek', days: [5, 'MON', 1], at: at9 }, '0 9 * * 1,5'],
    [{ kind: 'daysOfMonth', days: [15, 1], at: { hour: 12, minute: 0 } }, '0 12 1,15 * *'],
    [{ kind: 'hourRange', from: 9, to: 17 }, '0 9-17 * * *'],
    [{ kind: 'hourRange', from: 9, to: 17, minute: 30 }, '30 9-17 * * *'],
    [{ kind: 'monthRange', from: 'JUN', to: 'AUG' }, '* * * 6-8 *'],
    [{ kind: 'monthRange', from: 6, to: 8, at: at9 }, '0 9 * 6-8 *'],
  ])('%j -> %s', (input, expected) => {
    expect(build(input, { mode: 'standard' })).toBe(expected);
  });
});

describe('build() - quartz mode', () => {
  it.each<[CronBuilderInput, string]>([
    [{ kind: 'everyN', unit: 'minute', n: 5 }, '0 */5 * * * ?'],
    [{ kind: 'everyN', unit: 'hour', n: 2 }, '0 0 */2 * * ?'],
    [{ kind: 'everyN', unit: 'day', n: 3 }, '0 0 0 */3 * ?'],
    [{ kind: 'everyN', unit: 'year', n: 2 }, '0 0 0 1 1 ? */2'],
    [{ kind: 'at', times: [{ hour: 14, minute: 30, second: 15 }] }, '15 30 14 * * ?'],
    [{ kind: 'daysOfWeek', days: ['MON', 'FRI'], at: at9 }, '0 0 9 ? * 2,6'],
    [{ kind: 'daysOfWeek', days: [0], at: at9 }, '0 0 9 ? * 1'],
    [{ kind: 'hourRange', from: 9, to: 17 }, '0 0 9-17 * * ?'],
    [{ kind: 'monthRange', from: 'JUN', to: 'AUG' }, '0 * * * 6-8 ?'],
    [
      { kind: 'nthWeekdayOfMonth', nth: 3, weekday: 'WED', at: { hour: 14, minute: 0 } },
      '0 0 14 ? * 4#3',
    ],
    [{ kind: 'lastDayOfMonth', at: { hour: 23, minute: 59 } }, '0 59 23 L * ?'],
    [{ kind: 'lastWeekdayOfMonth', weekday: 'FRI', at: { hour: 17, minute: 0 } }, '0 0 17 ? * 6L'],
    [{ kind: 'weekdayNearestTo', day: 15, at: { hour: 12, minute: 0 } }, '0 0 12 15W * ?'],
  ])('%j -> %s', (input, expected) => {
    const expression = build(input, { mode: 'quartz' });
    expect(expression).toBe(expected);
    expect(validate(expression, { mode: 'quartz' }).valid).toBe(true);
  });
});

describe('buildResult() - invalid input', () => {
  it.each<[CronBuilderInput, 'standard' | 'quartz', string]>([
    [{ kind: 'lastDayOfMonth', at: at9 }, 'standard', 'mode-incompatibility'],
    [{ kind: 'everyN', unit: 'year', n: 2 }, 'standard', 'mode-incompatibility'],
    [
      { kind: 'at', times: [{ hour: 12, minute: 0, second: 30 }] },
      'standard',
      'mode-incompatibility',
    ],
    [{ kind: 'at', times: [at9, { hour: 17, minute: 30 }] }, 'standard', 'times-not-expressible'],
    [{ kind: 'at', times: [] }, 'standard', 'empty-list'],
    [{ kind: 'daysOfWeek', days: [], at: at9 }, 'standard', 'empty-list'],
    [{ kind: 'at', times: [{ hour: 25, minute: 0 }] }, 'standard', 'out-of-range'],
    [{ kind: 'everyN', unit: 'minute', n: 0 }, 'standard', 'out-of-range'],
    [{ kind: 'everyN', unit: 'month', n: 13 }, 'standard', 'out-of-range'],
    [{ kind: 'daysOfMonth', days: [32], at: at9 }, 'standard', 'out-of-range'],
    [{ kind: 'hourRange', from: 17, to: 9 }, 'standard', 'out-of-range'],
    [{ kind: 'hourRange', from: 9, to: 17, minute: 1.5 }, 'standard', 'out-of-range'],
    [{ kind: 'monthRange', from: 'AUG', to: 'JUN' }, 'standard', 'out-of-range'],
    [{ kind: 'daysOfWeek', days: [7 as 0], at: at9 }, 'quartz', 'out-of-range'],
    [{ kind: 'composite' } as unknown as CronBuilderInput, 'standard', 'unknown-kind'],
  ])('%j (%s) -> %s', (input, mode, code) => {
    const r = buildResult(input, { mode });
    expect(r.ok ? null : r.error.code).toBe(code);
  });

  it('rejects an unknown mode', () => {
    const r = buildResult({ kind: 'everyN', unit: 'minute', n: 5 }, { mode: 'auto' as 'standard' });
    expect(r.ok ? null : r.error.code).toBe('invalid-mode');
  });

  it('build() throws the same code as a CronError', () => {
    const run = (): string => build({ kind: 'at', times: [] }, { mode: 'standard' });
    expect(run).toThrow(CronError);
    expect(run).toThrow(expect.objectContaining({ code: 'empty-list' }));
  });
});
