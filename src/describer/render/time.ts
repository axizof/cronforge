import { interpolate } from './interpolate.js';
import type { FieldAst, FieldSet } from '../../ast/nodes.js';
import type { LocaleData } from '../locales/index.js';

export function renderTime(fields: FieldSet, locale: LocaleData): string {
  const { minute, hour, seconds } = fields;

  if (seconds !== undefined) {
    const everySeconds = matchEveryUnit(seconds);
    if (everySeconds !== null && isWildcard(minute) && isWildcard(hour)) {
      return everySeconds === 1
        ? locale.atoms['every_second']!
        : interpolate(locale.atoms['every_x_seconds']!, { count: String(everySeconds) });
    }
  }

  if (isWildcard(hour) && isMinuteWildcardOrZero(seconds)) {
    const everyMin = matchEveryUnit(minute);
    if (everyMin !== null) {
      return everyMin === 1
        ? locale.atoms['every_minute']!
        : interpolate(locale.atoms['every_x_minutes']!, { count: String(everyMin) });
    }
  }

  if (isValueZero(minute) && isMinuteWildcardOrZero(seconds)) {
    const everyHour = matchEveryUnit(hour);
    if (everyHour !== null) {
      return everyHour === 1
        ? locale.atoms['every_hour']!
        : interpolate(locale.atoms['every_x_hours']!, { count: String(everyHour) });
    }
  }

  const hourVal = singleValueOf(hour);
  const minuteVal = singleValueOf(minute);
  if (hourVal !== null && minuteVal !== null) {
    return interpolate(locale.atoms['at_time']!, {
      time: formatTime(hourVal, minuteVal, locale),
    });
  }
  if (hourVal !== null) {
    return interpolate(locale.atoms['at_time']!, {
      time: formatTime(hourVal, 0, locale),
    });
  }
  return locale.atoms['every_minute']!;
}

function isWildcard(node: FieldAst | undefined): boolean {
  return node !== undefined && node.kind === 'wildcard';
}

function isValueZero(node: FieldAst | undefined): boolean {
  return node !== undefined && node.kind === 'value' && node.value === 0;
}

function isMinuteWildcardOrZero(seconds: FieldAst | undefined): boolean {
  if (seconds === undefined) return true;
  return seconds.kind === 'value' && seconds.value === 0;
}

function matchEveryUnit(node: FieldAst): number | null {
  if (node.kind === 'wildcard') return 1;
  if (node.kind === 'step' && node.base.kind === 'wildcard') return node.step;
  return null;
}

function singleValueOf(node: FieldAst | undefined): number | null {
  if (node !== undefined && node.kind === 'value') return node.value;
  return null;
}

function formatTime(hour: number, minute: number, locale: LocaleData): string {
  const sep = locale.meta.timeSeparator ?? ':';
  if (locale.meta.timeFormat === '24h') {
    return `${pad2(hour)}${sep}${pad2(minute)}`;
  }
  const period = hour < 12 ? 'AM' : 'PM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}${sep}${pad2(minute)} ${period}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
