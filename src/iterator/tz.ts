export interface LocalDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

export interface WallClock extends LocalDateTime {
  /** 0..6, SUN = 0. */
  readonly dow: number;
}

const DAY_MS = 86_400_000;

// Building an Intl.DateTimeFormat is far more expensive than formatting with
// one, and the iterator converts dates thousands of times per call.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let fmt = formatters.get(tz);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(tz, fmt);
  }
  return fmt;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    formatterFor(tz);
    return true;
  } catch {
    return false;
  }
}

export function getWallClock(at: Date, tz: string): WallClock {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const p of formatterFor(tz).formatToParts(at)) parts[p.type] = Number(p.value);
  const { year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0 } = parts;
  return { year, month, day, hour, minute, second, dow: dayOfWeek(year, month, day) };
}

function localAsUtcMs(local: LocalDateTime): number {
  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
}

/** UTC offset in minutes (+ = east) of `tz` at instant `at`. */
function offsetMinutes(at: Date, tz: string): number {
  const wholeSeconds = Math.floor(at.getTime() / 1000) * 1000;
  return Math.round((localAsUtcMs(getWallClock(at, tz)) - wholeSeconds) / 60_000);
}

/**
 * Convert a local date-time in `tz` to an instant. Out-of-range fields
 * (day 32, hour 24…) roll over like `Date.UTC`.
 *
 * - Ambiguous time (DST fall-back): returns the `prefer`red of the two instants.
 * - Non-existent time (DST spring-forward gap): returns the instant shifted
 *   forward by the gap length, e.g. 02:30 → 03:30 in New York.
 */
export function localToUtc(local: LocalDateTime, tz: string, prefer: 'earlier' | 'later'): Date {
  const naive = localAsUtcMs(local);
  // Offsets a day before and after cover both sides of any DST transition.
  const offsets = new Set([
    offsetMinutes(new Date(naive - DAY_MS), tz),
    offsetMinutes(new Date(naive + DAY_MS), tz),
  ]);
  const candidates = [...offsets].map((o) => naive - o * 60_000).sort((a, b) => a - b);
  const exact = candidates.filter((t) => localAsUtcMs(getWallClock(new Date(t), tz)) === naive);

  const picked =
    exact.length === 0
      ? candidates[candidates.length - 1]
      : prefer === 'earlier'
        ? exact[0]
        : exact[exact.length - 1];
  return new Date(picked ?? naive);
}

/** 0 (Sunday) … 6 (Saturday). */
export function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
