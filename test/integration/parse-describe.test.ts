import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../src/index.js';

interface Fixture {
  readonly id: string;
  readonly expression: string;
  readonly mode: 'standard' | 'quartz';
  readonly en: string;
  readonly fr: string;
}

const FIXTURES: ReadonlyArray<Fixture> = [
  {
    id: 'integ-001',
    expression: '* * * 6-8 *',
    mode: 'standard',
    en: 'Every minute, June through August',
    fr: 'Toutes les minutes, de juin à août',
  },
  {
    id: 'integ-002',
    expression: '0 0 12 ? * MON',
    mode: 'quartz',
    en: 'At 12:00 PM, only on Monday',
    fr: 'À 12h00, uniquement le lundi',
  },
  {
    id: 'integ-003',
    expression: '0 0 12 * * ?',
    mode: 'quartz',
    en: 'At 12:00 PM every day',
    fr: 'À 12h00 tous les jours',
  },
  {
    id: 'integ-004',
    expression: '*/15 * * * *',
    mode: 'standard',
    en: 'Every 15 minutes, every day',
    fr: 'Toutes les 15 minutes, tous les jours',
  },
];

describeTest('integration: parse -> describe (EN + FR)', () => {
  for (const f of FIXTURES) {
    it(`${f.id} (en): ${f.expression}`, () => {
      expect(describe(f.expression, { mode: f.mode, locale: 'en' })).toBe(f.en);
    });
    it(`${f.id} (fr): ${f.expression}`, () => {
      expect(describe(f.expression, { mode: f.mode, locale: 'fr' })).toBe(f.fr);
    });
  }
});
