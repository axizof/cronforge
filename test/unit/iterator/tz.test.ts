import { describe, it, expect } from 'vitest';
import {
  daysInMonth,
  getWallClock,
  isValidTimeZone,
  localToUtc,
} from '../../../src/iterator/tz.js';

describe('getWallClock', () => {
  it('decomposes an instant in UTC', () => {
    expect(getWallClock(new Date('2026-06-01T10:30:45Z'), 'UTC')).toEqual({
      year: 2026,
      month: 6,
      day: 1,
      hour: 10,
      minute: 30,
      second: 45,
      dow: 1,
    });
  });

  it.each([
    ['2026-06-15T10:00:00Z', 'Europe/Paris', 12],
    ['2026-12-15T10:00:00Z', 'Europe/Paris', 11],
    ['2026-06-15T10:00:00Z', 'America/New_York', 6],
    ['2026-06-15T10:00:00Z', 'Asia/Kolkata', 15],
  ])('%s in %s is %i h local', (iso, tz, hour) => {
    expect(getWallClock(new Date(iso), tz).hour).toBe(hour);
  });

  it('reports midnight as hour 0', () => {
    expect(getWallClock(new Date('2026-06-15T22:00:00Z'), 'Europe/Paris').hour).toBe(0);
  });
});

describe('localToUtc', () => {
  const local = (month: number, day: number, hour: number, minute = 0) => ({
    year: 2026,
    month,
    day,
    hour,
    minute,
    second: 0,
  });

  it('converts an unambiguous local time', () => {
    expect(localToUtc(local(6, 15, 14, 30), 'Europe/Paris', 'earlier').toISOString()).toBe(
      '2026-06-15T12:30:00.000Z',
    );
  });

  it('rolls over out-of-range fields like Date.UTC', () => {
    expect(localToUtc({ ...local(1, 31, 24), day: 31 }, 'UTC', 'earlier').toISOString()).toBe(
      '2026-02-01T00:00:00.000Z',
    );
  });

  it('shifts a time inside a spring-forward gap forward by the gap length', () => {
    // 2026-03-08 02:30 does not exist in New York (clocks jump 02:00 -> 03:00 EDT).
    expect(localToUtc(local(3, 8, 2, 30), 'America/New_York', 'earlier').toISOString()).toBe(
      '2026-03-08T07:30:00.000Z',
    );
  });

  it('picks either instance of a time repeated by a fall-back', () => {
    // 2026-11-01 01:30 happens at 05:30Z (EDT) and again at 06:30Z (EST).
    const repeated = local(11, 1, 1, 30);
    expect(localToUtc(repeated, 'America/New_York', 'earlier').toISOString()).toBe(
      '2026-11-01T05:30:00.000Z',
    );
    expect(localToUtc(repeated, 'America/New_York', 'later').toISOString()).toBe(
      '2026-11-01T06:30:00.000Z',
    );
  });
});

describe('isValidTimeZone', () => {
  it.each(['UTC', 'Europe/Paris', 'America/Argentina/Buenos_Aires'])('accepts %s', (tz) => {
    expect(isValidTimeZone(tz)).toBe(true);
  });

  it.each(['Not/AZone', ''])('rejects %j', (tz) => {
    expect(isValidTimeZone(tz)).toBe(false);
  });
});

describe('daysInMonth', () => {
  it.each([
    [2026, 1, 31],
    [2026, 4, 30],
    [2026, 2, 28],
    [2024, 2, 29],
    [2100, 2, 28],
    [2000, 2, 29],
  ])('%i-%i has %i days', (year, month, days) => {
    expect(daysInMonth(year, month)).toBe(days);
  });
});
