import { describe as group, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';
import { parse } from '../../../src/parser/parse.js';
import { CronError } from '../../../src/parser/errors.js';

const en = (expression: string, mode: 'standard' | 'quartz' = 'standard'): string =>
  describe(expression, { mode, locale: 'en' });

group('describe() - time of day', () => {
  it.each([
    ['* * * * *', 'Every minute'],
    ['*/5 * * * *', 'Every 5 minutes'],
    ['0 * * * *', 'Every hour'],
    ['0 */2 * * *', 'Every 2 hours'],
    ['5 * * * *', 'At minute 5, every hour'],
    ['15,45 * * * *', 'At minute 15 and 45, every hour'],
    ['0-10 * * * *', 'At minute 0 through 10, every hour'],
    ['0-30/10 * * * *', 'Every 10 minutes, minutes 0 through 30'],
    ['0 9-17 * * *', 'Every hour, between 9:00 AM and 5:59 PM'],
    ['30 9-17 * * *', 'At minute 30, between 9:00 AM and 5:59 PM'],
    ['*/10 9-17 * * *', 'Every 10 minutes, between 9:00 AM and 5:59 PM'],
    ['* 9,17 * * *', 'Every minute, between 9:00 AM and 9:59 AM and between 5:00 PM and 5:59 PM'],
    ['0 8-18/2 * * *', 'Every 2 hours, between 8:00 AM and 6:59 PM'],
    ['30 14 * * *', 'At 2:30 PM, every day'],
    ['30 0 * * *', 'At 12:30 AM, every day'],
    ['30 9,17 * * *', 'At 9:30 AM and 5:30 PM, every day'],
  ])('%s -> %s', (expression, expected) => {
    expect(en(expression)).toBe(expected);
  });

  it.each([
    ['* * * ? * *', 'Every second'],
    ['*/15 * * ? * *', 'Every 15 seconds'],
    ['30 * * ? * *', 'At second 30, every minute'],
    ['0 0/15 * ? * *', 'Every 15 minutes'],
    ['0 5/20 * ? * *', 'Every 20 minutes, minutes 5 through 59'],
    ['30 0 12 ? * *', 'At 12:00:30 PM, every day'],
  ])('quartz %s -> %s', (expression, expected) => {
    expect(en(expression, 'quartz')).toBe(expected);
  });
});

group('describe() - days, months and years', () => {
  it.each([
    ['0 9 * * 1-5', 'At 9:00 AM, from Monday through Friday'],
    ['0 9 * * MON', 'At 9:00 AM, only on Monday'],
    ['0 9 * * MON,WED,FRI', 'At 9:00 AM, on Monday, Wednesday and Friday'],
    ['0 9 * * MON-WED,FRI', 'At 9:00 AM, on Monday through Wednesday and Friday'],
    ['0 9 * * 0,7', 'At 9:00 AM, only on Sunday'],
    ['0 9 1 * *', 'At 9:00 AM, on the 1st of the month'],
    ['0 9 1,15 * *', 'At 9:00 AM, on the 1st and 15th of the month'],
    ['0 9 1-15 * *', 'At 9:00 AM, on the 1st through 15th of the month'],
    ['0 9 */10 * *', 'At 9:00 AM, every 10 days'],
    ['0 9 1 * MON', 'At 9:00 AM, on the 1st of the month or on Monday'],
    ['0 9 */2 * MON', 'At 9:00 AM, every 2 days, only on Monday'],
    ['* * * 6-8 *', 'Every minute, June through August'],
    ['0 0 1 6 *', 'At 12:00 AM, on the 1st of the month, in June'],
    ['0 0 1 1,6,12 *', 'At 12:00 AM, on the 1st of the month, in January, June and December'],
    ['0 0 1 */3 *', 'At 12:00 AM, on the 1st of the month, in January, April, July and October'],
  ])('%s -> %s', (expression, expected) => {
    expect(en(expression)).toBe(expected);
  });

  it.each([
    ['0 0 12 L * ?', 'At 12:00 PM, on the last day of the month'],
    ['0 0 12 L-3 * ?', 'At 12:00 PM, 3 days before the last day of the month'],
    ['0 0 12 LW * ?', 'At 12:00 PM, on the last weekday of the month'],
    ['0 0 12 15W * ?', 'At 12:00 PM, on the weekday nearest the 15th'],
    ['0 0 12 ? * 6L', 'At 12:00 PM, on the last Friday of the month'],
    ['0 0 12 ? * 5#3', 'At 12:00 PM, on the third Thursday of the month'],
    ['0 0 12 ? * MON', 'At 12:00 PM, only on Monday'],
    ['0 0 12 ? * L', 'At 12:00 PM, only on Saturday'],
    ['0 0 12 1 6 ? 2026', 'At 12:00 PM, on the 1st of the month, in June, in 2026'],
    [
      '0 0 12 1 6 ? 2026-2028',
      'At 12:00 PM, on the 1st of the month, in June, in 2026 through 2028',
    ],
    [
      '0 0 12 1 1 ? 2026/2',
      'At 12:00 PM, on the 1st of the month, in January, every 2 years, starting in 2026',
    ],
  ])('quartz %s -> %s', (expression, expected) => {
    expect(en(expression, 'quartz')).toBe(expected);
  });

  it.each([
    ['@hourly', 'Every hour, at the top of the hour'],
    ['@daily', 'Every day, at midnight'],
    ['@reboot', 'At system startup (not iterable)'],
  ])('macro %s -> %s', (expression, expected) => {
    expect(en(expression)).toBe(expected);
  });
});

group('describe() - input', () => {
  it('gives the same text for a parsed expression and its source', () => {
    const expr = parse('0 0 12 ? * MON', { mode: 'quartz' });
    expect(describe(expr, { mode: 'quartz', locale: 'en' })).toBe(en('0 0 12 ? * MON', 'quartz'));
  });

  it('throws a CronError on an invalid expression', () => {
    expect(() => en('99 * * * *')).toThrow(CronError);
  });
});
