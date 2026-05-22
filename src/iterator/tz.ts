export interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  /** 0..6, SUN = 0. */
  readonly dow: number;
}

/** UTC offset in minutes (+ = east) for `tz` at instant `at`. */
export function getOffsetMinutes(at: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    hour12: false,
  });
  for (const p of fmt.formatToParts(at)) {
    if (p.type === 'timeZoneName') return parseLongOffset(p.value);
  }
  return 0;
}

function parseLongOffset(raw: string): number {
  const m = /^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/u.exec(raw);
  if (m === null) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const hours = Number.parseInt(m[2]!, 10);
  const minutes = m[3] !== undefined ? Number.parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

export function getWallClock(at: Date, tz: string): WallClock {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
  for (const p of fmt.formatToParts(at)) {
    const v = Number.parseInt(p.value, 10);
    if (Number.isNaN(v)) continue;
    switch (p.type) {
      case 'year': year = v; break;
      case 'month': month = v; break;
      case 'day': day = v; break;
      // Intl can emit '24' for midnight in some locales — normalise to 0.
      case 'hour': hour = v === 24 ? 0 : v; break;
      case 'minute': minute = v; break;
      case 'second': second = v; break;
      default: break;
    }
  }
  return { year, month, day, hour, minute, second, dow: dayOfWeek(year, month, day) };
}

/**
 * Inverse of `getWallClock`. DST gap → next valid instant (the iteration
 * loop re-verifies). DST overlap → first (earlier) of the two valid
 * instants matching the target wall-clock.
 */
export function wallClockToUtc(wc: Omit<WallClock, 'dow'>, tz: string): Date {
  const naiveUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
  let guessOffset = getOffsetMinutes(new Date(naiveUtc), tz);
  let utc = naiveUtc - guessOffset * 60_000;
  const refinedOffset = getOffsetMinutes(new Date(utc), tz);
  if (refinedOffset !== guessOffset) {
    utc = naiveUtc - refinedOffset * 60_000;
    guessOffset = refinedOffset;
  }

  // Overlap detection: if `utc - 1h` maps back to the same wall-clock,
  // the target is ambiguous and we prefer the earlier UTC.
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

/** Zeller's congruence. Returns 0 (Sunday) … 6 (Saturday). */
function dayOfWeek(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m < 3) { m += 12; y -= 1; }
  const k = y % 100;
  const j = Math.floor(y / 100);
  // Zeller returns 0 = Saturday; shift to 0 = Sunday.
  const h =
    (day + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return (h + 6) % 7;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}
