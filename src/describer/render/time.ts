import { interpolate } from './interpolate.js';
import type { FieldAst, FieldSet } from '../../ast/nodes.js';
import type { LocaleData } from '../locales/index.js';

/**
 * Render the time-of-day clause (combining seconds/minute/hour) into a
 * locale-formatted phrase. Returns the time fragment as the first piece
 * of the overall sentence - capitalised when it starts the sentence.
 */
export function renderTime(fields: FieldSet, locale: LocaleData): string {
  const minute = fields.minute;
  const hour = fields.hour;
  const seconds = fields.seconds;

  // "Every X seconds" / "Every second" - only when Quartz seconds matter.
  if (seconds !== undefined) {
    const everySeconds = matchEveryUnit(seconds);
    if (everySeconds !== null && isWildcard(minute) && isWildcard(hour)) {
      return everySeconds === 1
        ? locale.atoms['every_second']!
        : interpolate(locale.atoms['every_x_seconds']!, { count: String(everySeconds) });
    }
  }

  // "Every minute" / "Every N minutes" (when hour is wildcard)
  if (isWildcard(hour) && isMinuteWildcardOrZero(seconds)) {
    const everyMin = matchEveryUnit(minute);
    if (everyMin !== null) {
      return everyMin === 1
        ? locale.atoms['every_minute']!
        : interpolate(locale.atoms['every_x_minutes']!, { count: String(everyMin) });
    }
  }

  // "Every hour" / "Every N hours" (when minute is fixed at 0)
  if (isValueZero(minute) && isMinuteWildcardOrZero(seconds)) {
    const everyHour = matchEveryUnit(hour);
    if (everyHour !== null) {
      return everyHour === 1
        ? locale.atoms['every_hour']!
        : interpolate(locale.atoms['every_x_hours']!, { count: String(everyHour) });
    }
  }

  // "At H:MM …" - concrete time of day.
  const hourVal = singleValueOf(hour);
  const minuteVal = singleValueOf(minute) ?? (isWildcard(minute) ? null : null);
  if (hourVal !== null && minuteVal !== null) {
    const time = formatTime(hourVal, minuteVal, locale);
    return interpolate(locale.atoms['at_time']!, { time });
  }

  // Fallback: best-effort. Render the hour we know about.
  if (hourVal !== null) {
    const time = formatTime(hourVal, 0, locale);
    return interpolate(locale.atoms['at_time']!, { time });
  }

  // Minute fixed, hour wildcard already handled above. Anything else
  // (e.g. complex minute lists with hour wildcard) -> "Every minute"
  // as a conservative placeholder.
  return locale.atoms['every_minute']!;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function isWildcard(node: FieldAst | undefined): boolean {
  return node !== undefined && node.kind === 'wildcard';
}

function isValueZero(node: FieldAst | undefined): boolean {
  return node !== undefined && node.kind === 'value' && node.value === 0;
}

function isMinuteWildcardOrZero(seconds: FieldAst | undefined): boolean {
  // For non-Quartz expressions seconds is undefined: treat as "ok".
  if (seconds === undefined) return true;
  if (seconds.kind === 'value' && seconds.value === 0) return true;
  return false;
}

function matchEveryUnit(node: FieldAst): number | null {
  if (node.kind === 'wildcard') return 1;
  if (node.kind === 'step' && node.base.kind === 'wildcard') return node.step;
  return null;
}

function singleValueOf(node: FieldAst | undefined): number | null {
  if (node === undefined) return null;
  if (node.kind === 'value') return node.value;
  return null;
}

function formatTime(hour: number, minute: number, locale: LocaleData): string {
  if (locale.meta.timeFormat === '24h') {
    // Default separator for 24h is ':'; French historically uses 'h'.
    const sep = locale.meta.timeSeparator ?? ':';
    return `${pad2(hour)}${sep}${pad2(minute)}`;
  }
  // 12h
  const sep = locale.meta.timeSeparator ?? ':';
  const period = hour < 12 ? 'AM' : 'PM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}${sep}${pad2(minute)} ${period}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
