import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  describe as cfDescribe,
  nextOccurrences,
  tryParse,
  validate,
  type CronMode,
  type Locale,
  type ValidationError,
} from '../../src/index.js';

interface NextOccurrencesCase {
  readonly from: string;
  readonly count: number;
  readonly timezone?: string;
  readonly expected: ReadonlyArray<string>;
}

interface ValidationErrorAssertion {
  readonly code: string;
  readonly field?: ValidationError['field'];
}

interface TestCase {
  readonly id: string;
  readonly expression: string;
  readonly mode: CronMode;
  readonly valid: boolean;
  readonly dialect?: 'standard' | 'quartz';
  readonly descriptors?: Readonly<Record<string, string>>;
  readonly nextOccurrences?: NextOccurrencesCase;
  readonly validation?: { readonly errors: ReadonlyArray<ValidationErrorAssertion> };
  readonly notes?: string;
}

interface FixtureFile {
  readonly version: string;
  readonly cases: ReadonlyArray<TestCase>;
}

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '..', '..', 'shared-tests', 'cases.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as FixtureFile;

describe(`shared-tests/cases.json v${fixture.version} (${fixture.cases.length} cases)`, () => {
  for (const c of fixture.cases) {
    runCase(c);
  }
});

function runCase(c: TestCase): void {
  describe(c.id, () => {
    it(`validate ${JSON.stringify(c.expression)} -> valid=${c.valid}`, () => {
      const r = validate(c.expression, { mode: c.mode });
      expect(r.valid).toBe(c.valid);
    });

    if (c.valid) {
      it('parses successfully', () => {
        const r = tryParse(c.expression, { mode: c.mode });
        expect(r.ok).toBe(true);
        if (!r.ok) throw new Error('unreachable');
        if (c.dialect !== undefined) {
          expect(r.value.dialect).toBe(c.dialect);
        }
      });

      if (c.descriptors !== undefined) {
        for (const [loc, expected] of Object.entries(c.descriptors)) {
          it(`describes (${loc}) exactly`, () => {
            const out = cfDescribe(c.expression, {
              mode: c.mode,
              locale: loc as Locale,
            });
            expect(out).toBe(expected);
          });
        }
      }

      if (c.nextOccurrences !== undefined) {
        const no = c.nextOccurrences;
        it(`yields ${no.count} occurrence(s) matching expected ISO timestamps`, () => {
          const r = nextOccurrences(c.expression, no.count, {
            mode: c.mode,
            startFrom: new Date(no.from),
            ...(no.timezone !== undefined ? { timezone: no.timezone } : {}),
          });
          expect(r).toHaveLength(no.count);
          expect(r.map((d) => d.toISOString())).toEqual(
            no.expected.map((iso) => new Date(iso).toISOString()),
          );
        });
      }
    } else if (c.validation !== undefined) {
      for (const expected of c.validation.errors) {
        it(`reports error code '${expected.code}'`, () => {
          const r = validate(c.expression, { mode: c.mode });
          const codes = r.errors.map((e) => e.code);
          expect(codes).toContain(expected.code);
          if (expected.field !== undefined) {
            const matching = r.errors.find(
              (e) => e.code === expected.code && e.field === expected.field,
            );
            expect(
              matching,
              `no error with code=${expected.code} field=${expected.field}`,
            ).toBeDefined();
          }
        });
      }
    }
  });
}
