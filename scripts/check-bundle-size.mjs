#!/usr/bin/env node
// Fails when the gzipped ESM bundle grows past the budget.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 20;
const file = new URL('../dist/index.js', import.meta.url);

const gzippedKb = gzipSync(readFileSync(file), { level: 9 }).byteLength / 1024;
console.log(`dist/index.js: ${gzippedKb.toFixed(2)} KB gzipped (budget ${BUDGET_KB} KB)`);

if (gzippedKb > BUDGET_KB) {
  console.error(`Bundle exceeds the budget by ${(gzippedKb - BUDGET_KB).toFixed(2)} KB`);
  process.exit(1);
}
