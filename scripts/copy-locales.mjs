#!/usr/bin/env node
// Copy src/describer/locales/*.json -> dist/locales/*.json so the
// `package.json` `exports` sub-paths (e.g. `cronforge/locales/fr.json`)
// resolve at install time. The .ts modules remain the runtime source of
// truth - these JSON files are the i18next-compatible mirror documented
// in contracts/locale-format.md.

import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'describer', 'locales');
const dst = join(here, '..', 'dist', 'locales');

await mkdir(dst, { recursive: true });
const entries = await readdir(src);
const jsons = entries.filter((f) => f.endsWith('.json'));
for (const file of jsons) {
  await copyFile(join(src, file), join(dst, file));
}
process.stdout.write(`copied ${jsons.length} locale JSON file(s) to dist/locales/\n`);
