import { bench, describe } from 'vitest';
import { parse, validate, nextOccurrences, describe as cfDescribe, build } from '../../src/index.js';

// Plan §Performance Goals:
//   parse() ≤ 1 ms (Node 18+)
//   nextOccurrences(_, 100) ≤ 10 ms (Node 18+)
// These benchmarks are observational - they do not gate CI, but a sudden
// 5×+ regression should be investigated.

describe('parse', () => {
  bench('standard: */5 * * * *', () => {
    parse('*/5 * * * *', { mode: 'standard' });
  });
  bench('quartz: 0 0 12 ? * MON-FRI', () => {
    parse('0 0 12 ? * MON-FRI', { mode: 'quartz' });
  });
  bench('macro: @daily', () => {
    parse('@daily', { mode: 'standard' });
  });
});

describe('validate', () => {
  bench('valid expression', () => {
    validate('*/5 * * * *', { mode: 'standard' });
  });
  bench('invalid expression', () => {
    validate('99 * * * *', { mode: 'standard' });
  });
});

describe('describe', () => {
  bench('en: */15 * * * *', () => {
    cfDescribe('*/15 * * * *', { mode: 'standard', locale: 'en' });
  });
  bench('fr: 0 0 12 ? * MON', () => {
    cfDescribe('0 0 12 ? * MON', { mode: 'quartz', locale: 'fr' });
  });
});

describe('nextOccurrences', () => {
  const startFrom = new Date('2026-06-01T10:00:00Z');
  bench('standard, count=100, UTC', () => {
    nextOccurrences('*/5 * * * *', 100, { mode: 'standard', startFrom, timezone: 'UTC' });
  });
  bench('quartz, count=100, Europe/Paris', () => {
    nextOccurrences('0 0 12 ? * MON-FRI', 100, {
      mode: 'quartz',
      startFrom,
      timezone: 'Europe/Paris',
    });
  });
});

describe('build', () => {
  bench('daysOfWeek', () => {
    build(
      { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } },
      { mode: 'standard' },
    );
  });
});
