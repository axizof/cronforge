import { describe, it, expect } from 'vitest';
import {
  getOffsetMinutes,
  getWallClock,
  wallClockToUtc,
  daysInMonth,
} from '../../../src/iterator/tz.js';

describe('getOffsetMinutes', () => {
  it('returns 0 for UTC', () => {
    expect(getOffsetMinutes(new Date('2026-06-15T12:00:00Z'), 'UTC')).toBe(0);
  });

  it('returns +120 for Europe/Paris in summer (CEST)', () => {
    expect(getOffsetMinutes(new Date('2026-06-15T12:00:00Z'), 'Europe/Paris')).toBe(120);
  });

  it('returns +60 for Europe/Paris in winter (CET)', () => {
    expect(getOffsetMinutes(new Date('2026-12-15T12:00:00Z'), 'Europe/Paris')).toBe(60);
  });

  it('returns -300 for America/New_York in winter (EST)', () => {
    expect(getOffsetMinutes(new Date('2026-12-15T17:00:00Z'), 'America/New_York')).toBe(-300);
  });

  it('returns -240 for America/New_York in summer (EDT)', () => {
    expect(getOffsetMinutes(new Date('2026-06-15T17:00:00Z'), 'America/New_York')).toBe(-240);
  });

  it('returns +540 for Asia/Tokyo', () => {
    expect(getOffsetMinutes(new Date('2026-06-15T12:00:00Z'), 'Asia/Tokyo')).toBe(540);
  });
});

describe('getWallClock', () => {
  it('decomposes a UTC instant into UTC wall-clock', () => {
    const wc = getWallClock(new Date('2026-06-01T10:30:45Z'), 'UTC');
    expect(wc.year).toBe(2026);
    expect(wc.month).toBe(6);
    expect(wc.day).toBe(1);
    expect(wc.hour).toBe(10);
    expect(wc.minute).toBe(30);
    expect(wc.second).toBe(45);
    // 2026-06-01 is a Monday.
    expect(wc.dow).toBe(1);
  });

  it('converts a UTC instant to Europe/Paris wall-clock', () => {
    const wc = getWallClock(new Date('2026-06-15T10:00:00Z'), 'Europe/Paris');
    expect(wc.hour).toBe(12);
  });

  it('handles year boundaries', () => {
    const wc = getWallClock(new Date('2026-12-31T23:59:59Z'), 'UTC');
    expect(wc.year).toBe(2026);
    expect(wc.month).toBe(12);
    expect(wc.day).toBe(31);
  });
});

describe('wallClockToUtc', () => {
  it('round-trips a non-DST wall-clock', () => {
    const target = { year: 2026, month: 6, day: 15, hour: 14, minute: 30, second: 0 };
    const utc = wallClockToUtc(target, 'Europe/Paris');
    const back = getWallClock(utc, 'Europe/Paris');
    expect(back.year).toBe(target.year);
    expect(back.month).toBe(target.month);
    expect(back.day).toBe(target.day);
    expect(back.hour).toBe(target.hour);
    expect(back.minute).toBe(target.minute);
  });

  it('round-trips UTC identity', () => {
    const target = { year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: 0 };
    const utc = wallClockToUtc(target, 'UTC');
    expect(utc.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
  });
  it('returns 28 for non-leap February', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });
  it('returns 29 for leap-year February (div-by-4 not div-by-100)', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });
  it('returns 28 for century non-leap (div-by-100 not div-by-400)', () => {
    expect(daysInMonth(2100, 2)).toBe(28);
  });
  it('returns 29 for century leap (div-by-400)', () => {
    expect(daysInMonth(2000, 2)).toBe(29);
  });
  it('returns 30 for April', () => {
    expect(daysInMonth(2026, 4)).toBe(30);
  });
});
