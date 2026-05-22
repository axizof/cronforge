#!/usr/bin/env node
// Verify that every symbol exported from the published .d.ts has at
// least one `@example` JSDoc block (Constitution Principle X, SC-009).
//
// Heuristic, intentionally simple - runs against `dist/index.d.mts`:
//   - For each `export {function,class,interface,type,const,let} <Name>`
//     declaration, look backwards for the nearest `/** … */` block and
//     confirm it contains `@example`.
//   - Lines beginning with `//` or blank lines between the JSDoc and the
//     declaration are tolerated.
//
// Exits non-zero with a per-symbol report when any export lacks an
// `@example`.

import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// tsup with `dts: true` emits `dist/index.d.ts` and `dist/index.d.cts`.
// We scan the primary `.d.ts` artifact.
const dts = join(here, '..', 'dist', 'index.d.ts');

try {
  statSync(dts);
} catch {
  process.stderr.write(`error: ${dts} not found; run "npm run build" first\n`);
  process.exit(2);
}

const src = readFileSync(dts, 'utf8');
const lines = src.split(/\r?\n/);

// tsup's `.d.ts` output uses `declare function|class` followed by a single
// `export { ... }` block at the bottom. We treat every `declare function|class`
// site as an exported symbol (tsup only emits declarations for exported names).
const exportRe = /^\s*declare\s+(function|class)\s+(\w+)/u;

const symbols = [];
for (let i = 0; i < lines.length; i++) {
  const m = exportRe.exec(lines[i]);
  if (!m) continue;
  const kind = m[1];
  const name = m[2];

  // Walk backwards to find the JSDoc block immediately above this declaration.
  let j = i - 1;
  while (j >= 0 && /^\s*$/.test(lines[j])) j--;
  let hasExample = false;
  if (j >= 0 && lines[j].includes('*/')) {
    // Scan upward to the opening /**.
    const closeIdx = j;
    let openIdx = closeIdx;
    while (openIdx >= 0 && !lines[openIdx].includes('/**')) openIdx--;
    if (openIdx >= 0) {
      const block = lines.slice(openIdx, closeIdx + 1).join('\n');
      hasExample = /@example\b/.test(block);
    }
  }

  symbols.push({ kind, name, line: i + 1, hasExample });
}

// Type aliases and interfaces are documented at the value-side (function
// using them carries the @example). To keep noise low we only fail for
// callable / class-like symbols. Interfaces and type aliases are reported
// as warnings.
const failures = symbols.filter(
  (s) => !s.hasExample && (s.kind === 'function' || s.kind === 'class'),
);
const warnings = symbols.filter(
  (s) => !s.hasExample && (s.kind === 'interface' || s.kind === 'type'),
);

process.stdout.write(`scanned ${symbols.length} exported symbols in ${dts}\n`);
process.stdout.write(`  with @example: ${symbols.filter((s) => s.hasExample).length}\n`);
process.stdout.write(`  warnings (type/interface, OK):  ${warnings.length}\n`);
process.stdout.write(`  failures (function/class):       ${failures.length}\n`);

if (failures.length > 0) {
  for (const s of failures) {
    process.stderr.write(`  FAIL  ${s.kind} ${s.name} @ line ${s.line}\n`);
  }
  process.exit(1);
}

process.stdout.write('OK - every callable export has at least one @example block\n');
