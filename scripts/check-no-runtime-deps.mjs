#!/usr/bin/env node
// SC-008: verify that `package.json` declares zero runtime dependencies.
// Cheaper alternative to actually running `npm install --omit=dev` in CI.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const deps = pkg.dependencies ?? {};
const peer = pkg.peerDependencies ?? {};
const optional = pkg.optionalDependencies ?? {};

const allRuntime = { ...deps, ...peer, ...optional };
const count = Object.keys(allRuntime).length;

if (count === 0) {
  process.stdout.write('OK - zero runtime dependencies (Principle I, SC-008)\n');
  process.exit(0);
}

process.stderr.write(`error: ${count} runtime dependency entry(ies) found:\n`);
for (const [name, version] of Object.entries(allRuntime)) {
  process.stderr.write(`  ${name}: ${String(version)}\n`);
}
process.exit(1);
