import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const patterns = [
  'packages/**/src/**/*.ts',
  'apps/**/src/**/*.ts'
];

const files = new Set();
for (const pattern of patterns) {
  const matches = await glob(pattern, {
    cwd: repoRoot,
    nodir: true,
    absolute: true,
    ignore: ['**/*.d.ts', '**/dist/**']
  });
  matches.forEach(f => files.add(f));
}

const importRegex = /(import\s+(?:[^'";]+?from\s+)?|export\s+[^'";]*?from\s+)(["'])(\.\.?\/[^"']*?)\.ts(\2)/g;
const dynamicRegex = /(import\s*\()(\s*["'])(\.\.?\/[^"']*?)\.ts(\2\s*\))/g;
let updatedCount = 0;

for (const file of files) {
  let contents = await fs.readFile(file, 'utf8');
  const original = contents;
  contents = contents.replace(importRegex, (_, prefix, quote, rel, suffixQuote) => `${prefix}${quote}${rel}.js${suffixQuote}`);
  contents = contents.replace(dynamicRegex, (_, prefix, quote, rel, suffix) => `${prefix}${quote}${rel}.js${suffix}`);
  if (contents !== original) {
    await fs.writeFile(file, contents, 'utf8');
    updatedCount++;
  }
}

console.log(`Updated ${updatedCount} files.`);
