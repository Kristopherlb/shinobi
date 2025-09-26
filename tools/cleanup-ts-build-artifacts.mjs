#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { globSync } from 'glob';

const patterns = [
  'packages/core/src/**/*.@(js|js.map|d.ts|d.ts.map)',
  'packages/contracts/src/**/*.@(js|js.map|d.ts|d.ts.map)'
];

function isTracked(file) {
  try {
    execSync(`git ls-files --error-unmatch "${file}"`, {
      stdio: 'ignore'
    });
    return true;
  } catch (err) {
    return false;
  }
}

let removed = 0;
for (const pattern of patterns) {
  const matches = globSync(pattern, { nodir: true });
  for (const file of matches) {
    if (isTracked(file)) {
      continue;
    }
    rmSync(file, { force: true });
    removed += 1;
  }
}

if (removed > 0) {
  console.log(`cleanup-ts-build-artifacts: removed ${removed} generated files`);
}
