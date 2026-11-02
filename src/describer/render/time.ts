import { QUARTZ_META, STANDARD_META } from '../../parser/field-meta.js';
import type { FieldSet } from '../../ast/nodes.js';
import type { LocaleData } from '../locales/index.js';
import { shapeOf } from './shape.js';
import type { Shape } from './shape.js';
import { formatTime, joinList, listValues, phrase, toRuns } from './text.js';

// Above this many fire times per day, "every hour, between …" reads better
// than listing each time.
const MAX_LISTED_TIMES = 4;

const SECOND_ZERO: Shape = { kind: 'values', values: [0] };

interface TimeDescription {
  readonly text: string;
  /** The schedule fires at a few fixed times of day ("at 9:00 AM"). */
  readonly isFixedTime: boolean;
}

export function renderTime(fields: FieldSet, locale: LocaleData): TimeDescription {
  const second =
    fields.seconds === undefined ? SECOND_ZERO : shapeOf(fields.seconds, QUARTZ_META.seconds);
  const minute = shapeOf(fields.minute, STANDARD_META.minute);
  const hour = shapeOf(fields.hour, STANDARD_META.hour);

  if (
    second.kind === 'values' &&
    minute.kind === 'values' &&
    hour.kind === 'values' &&
    second.values.length * minute.values.length * hour.values.length <= MAX_LISTED_TIMES
  ) {
    const times = hour.values.flatMap((h) =>
      minute.values.flatMap((m) => second.values.map((s) => formatTime(h, m, s, locale))),
    );
    return {
      text: phrase(locale, 'at_time', { time: joinList(times, locale) }),
      isFixedTime: true,
    };
  }

  const secondClause = isOnlyZero(second) ? null : unitClause(second, 'second', locale);
  const onTheHour = secondClause === null && isOnlyZero(minute);
  const clauses: string[] = [];
  if (secondClause !== null) clauses.push(secondClause);

  if (minute.kind === 'all') {
    if (second.kind === 'values') clauses.push(phrase(locale, 'every_minute'));
  } else if (!onTheHour) {
    clauses.push(unitClause(minute, 'minute', locale));
  }

  clauses.push(...hourClauses(hour, onTheHour, minute.kind === 'values', locale));
  return { text: clauses.join(', '), isFixedTime: false };
}

function unitClause(shape: Shape, unit: 'second' | 'minute', locale: LocaleData): string {
  switch (shape.kind) {
    case 'all':
      return phrase(locale, `every_${unit}`);
    case 'values':
      return phrase(locale, `at_${unit}`, { values: listValues(shape.values, String, locale) });
    case 'every': {
      const every =
        shape.step === 1
          ? phrase(locale, `every_${unit}`)
          : phrase(locale, `every_x_${unit}s`, { count: String(shape.step) });
      if (shape.full) return every;
      const window = phrase(locale, `${unit}_window`, {
        from: String(shape.from),
        to: String(shape.to),
      });
      return `${every}, ${window}`;
    }
  }
}

function hourClauses(
  hour: Shape,
  onTheHour: boolean,
  minuteIsFixed: boolean,
  locale: LocaleData,
): string[] {
  switch (hour.kind) {
    case 'all':
      return onTheHour || minuteIsFixed ? [phrase(locale, 'every_hour')] : [];
    case 'every': {
      const every =
        hour.step === 1
          ? phrase(locale, 'every_hour')
          : phrase(locale, 'every_x_hours', { count: String(hour.step) });
      return hour.full ? [every] : [every, between(hour.from, hour.to, locale)];
    }
    case 'values': {
      const windows = toRuns(hour.values).map((r) => between(r.from, r.to, locale));
      const joined = joinList(windows, locale);
      return onTheHour ? [phrase(locale, 'every_hour'), joined] : [joined];
    }
  }
}

function between(fromHour: number, toHour: number, locale: LocaleData): string {
  return phrase(locale, 'between_times', {
    from: formatTime(fromHour, 0, 0, locale),
    to: formatTime(toHour, 59, 0, locale),
  });
}

function isOnlyZero(shape: Shape): boolean {
  return shape.kind === 'values' && shape.values.length === 1 && shape.values[0] === 0;
}
