#!/usr/bin/env node
// Publishes the locale JSON files as `cronforge/locales/<code>.json`
// (see `exports` in package.json). The library itself bundles them.
import { cp } from 'node:fs/promises';

await cp(
  new URL('../src/describer/locales/', import.meta.url),
  new URL('../dist/locales/', import.meta.url),
  {
    recursive: true,
    filter: (src) => !src.endsWith('.ts'),
  },
);
