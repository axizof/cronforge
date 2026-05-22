/**
 * Timezone helpers built on top of `Intl.DateTimeFormat`. No runtime
 * dependency - `Intl.DateTimeFormat` with `timeZone` and
 * `timeZoneName: 'longOffset'` is universally supported in Node 18+ and
 * modern browsers (per research.md Decision 3).
 *
 * Two abstractions live here:
 *   - `WallClock` - a calendar struct in some IANA timezone.
 *   - `getWallClock` / `wallClockToUtc` - round-trip between an absolute
 *     `Date` and its local representation.
 */

export interface WallClock {
  readonly year: number;
  readonly month: number; // 1..12
  readonly day: number; // 1..31
  readonly hour: number; // 0..23
  readonly minute: number; // 0..59
  readonly second: number; // 0..59
  /** 0..6 with SUN = 0 (standard convention). */
  readonly dow: number;
}

/**
 * Return the UTC offset (in minutes, +ve = east of UTC) that the
 * timezone `tz` is observing at the absolute instant `at`.
 *
 * Implemented via `Intl.DateTimeFormat` with
 * `timeZoneName: 'longOffset'`, which produces `'GMT+HH:MM'` or
 * `'GMT-HH:MM'` for every IANA zone since 2020-era ICU.
 *
 * @example
 * ```ts
 * getOffsetMinutes(new Date('2026-06-15T12:00:00Z'), 'Europe/Paris'); // 120
 * getOffsetMinutes(new Date('2026-12-15T12:00:00Z'), 'Europe/Paris'); // 60
 * ```
 */
export function getOffsetMinutes(at: Date, tz: string): number {
  // Build a formatter once per (tz) call site - small allocation, ~10 μs.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  for (const p of parts) {
    if (p.type === 'timeZoneName') {
      return parseLongOffset(p.value);
    }
  }
  return 0;
}

function parseLongOffset(raw: string): number {
  // Examples: "GMT", "GMT+02:00", "GMT-05:30", "UTC", "UTC+5"
  const m = /^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/u.exec(raw);
  if (m === null) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const hours = Number.parseInt(m[2]!, 10);
  const minutes = m[3] !== undefined ? Number.parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

/**
 * Convert an absolute `Date` to its wall-clock representation in `tz`.
 *
 * Uses `Intl.DateTimeFormat` to extract calendar parts, then computes
 * the day-of-week numerically from the resulting Y/M/D triple (faster
 * and more deterministic than asking Intl for the weekday string).
 */
export function getWallClock(at: Date, tz: string): WallClock {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const p of parts) {
    const v = Number.parseInt(p.value, 10);
    if (Number.isNaN(v)) continue;
    switch (p.type) {
      case 'year':
        year = v;
        break;
      case 'month':
        month = v;
        break;
      case 'day':
        day = v;
        break;
      case 'hour':
        // Intl may emit '24' for midnight in some locales; normalise to 0.
        hour = v === 24 ? 0 : v;
        break;
      case 'minute':
        minute = v;
        break;
      case 'second':
        second = v;
        break;
      default:
        break;
    }
  }
  const dow = dayOfWeek(year, month, day);
  return { year, month, day, hour, minute, second, dow };
}

/**
 * Convert a wall-clock target in `tz` back to an absolute `Date`.
 *
 * The result is the UTC instant whose wall-clock representation in `tz`
 * equals the target. Handles non-existent local times (DST gap) by
 * advancing to the next valid instant. Handles ambiguous local times
 * (DST overlap) by returning the FIRST (earlier) of the two valid
 * instants (FR-020, spec Assumptions §DST).
 */
export function wallClockToUtc(wc: Omit<WallClock, 'dow'>, tz: string): Date {
  // First guess: pretend the wall-clock numbers are already UTC.
  const naiveUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
  // Find the offset that applies at that *local* time. We use a guess
  // at the offset around that instant; one iteration is sufficient
  // except near DST transitions, where we refine.
  let guessOffset = getOffsetMinutes(new Date(naiveUtc), tz);
  let utc = naiveUtc - guessOffset * 60_000;
  // Re-check offset at the corrected instant and refine if it changed.
  const refinedOffset = getOffsetMinutes(new Date(utc), tz);
  if (refinedOffset !== guessOffset) {
    utc = naiveUtc - refinedOffset * 60_000;
    guessOffset = refinedOffset;
  }

  // DST overlap: pick the earlier UTC. When the local time is ambiguous,
  // the offset BEFORE the fall-back is greater than the offset AFTER.
  // wallClockToUtc with the post-transition (smaller) offset would
  // produce a later UTC. Detect by checking if subtracting an hour and
  // re-checking still maps back to the same wall-clock.
  const earlierUtc = utc - 60 * 60_000;
  const earlierWc = getWallClock(new Date(earlierUtc), tz);
  if (
    earlierWc.year === wc.year &&
    earlierWc.month === wc.month &&
    earlierWc.day === wc.day &&
    earlierWc.hour === wc.hour &&
    earlierWc.minute === wc.minute &&
    earlierWc.second === wc.second
  ) {
    return new Date(earlierUtc);
  }

  return new Date(utc);
}

/** Zeller's congruence - day of week for a given Gregorian date.
 *  Returns 0 (Sunday) through 6 (Saturday). */
function dayOfWeek(year: number, month: number, day: number): number {
  // Treat January / February as months 13 / 14 of the previous year.
  let y = year;
  let m = month;
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  const k = y % 100;
  const j = Math.floor(y / 100);
  // Zeller returns 0 = Saturday. Convert to 0 = Sunday.
  const h =
    (day + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return (h + 6) % 7;
}

/** Number of days in the given month/year (handles leap years). */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}
