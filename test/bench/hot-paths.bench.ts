import { test } from 'vitest';
import { build, describe, nextOccurrences, parse, validate } from '../../src/index.js';

// Observational only: CI does not run these. Investigate any large regression.

const startFrom = new Date('2026-06-01T10:00:00Z');

test('parse', async ({ bench }) => {
  await bench('standard */5 * * * *', () => parse('*/5 * * * *', { mode: 'standard' })).run();
  await bench('quartz 0 0 12 ? * MON-FRI', () =>
    parse('0 0 12 ? * MON-FRI', { mode: 'quartz' }),
  ).run();
});

test('validate', async ({ bench }) => {
  await bench('invalid expression', () => validate('99 * * * *', { mode: 'standard' })).run();
});

test('describe', async ({ bench }) => {
  await bench('en */10 9-17 * * 1-5', () =>
    describe('*/10 9-17 * * 1-5', { mode: 'standard', locale: 'en' }),
  ).run();
});

test('nextOccurrences', async ({ bench }) => {
  await bench('100 runs, UTC', () =>
    nextOccurrences('*/5 * * * *', 100, { mode: 'standard', startFrom, timezone: 'UTC' }),
  ).run();
  await bench('100 runs, Europe/Paris', () =>
    nextOccurrences('0 0 12 ? * MON-FRI', 100, {
      mode: 'quartz',
      startFrom,
      timezone: 'Europe/Paris',
    }),
  ).run();
});

test('build', async ({ bench }) => {
  await bench('daysOfWeek', () =>
    build(
      { kind: 'daysOfWeek', days: ['MON', 'WED', 'FRI'], at: { hour: 9, minute: 0 } },
      { mode: 'standard' },
    ),
  ).run();
});
