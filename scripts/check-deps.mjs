#!/usr/bin/env node
/**
 * Check system dependencies required for platform audit CLI.
 * Verifies that required tools (ripgrep, node, pnpm) are installed and accessible.
 */

import { spawnSync } from 'child_process';

/**
 * Check if a command is available and executable.
 * @param {string} cmd - Command name to check
 * @param {string[]} args - Arguments to pass to the command (default: ['--version'])
 * @returns {boolean} True if command is available and executable
 */
function checkCmd(cmd, args = ['--version']) {
  const res = spawnSync(cmd, args, { stdio: 'pipe' });
  if (res.status !== 0) {
    console.error(`❌ Missing or unusable dependency: ${cmd}`);
    if (res.stderr) {
      console.error(`   Error: ${res.stderr.toString().trim()}`);
    }
    return false;
  }
  const version = res.stdout.toString().trim();
  console.log(`✅ ${cmd} found: ${version}`);
  return true;
}

// Required system dependencies
const checks = [
  () => checkCmd('rg'),              // ripgrep (required for platform audit CLI)
  () => checkCmd('node', ['-v']),    // Node.js
  () => checkCmd('pnpm', ['--version']) // pnpm package manager
];

console.log('Checking system dependencies...\n');

const results = checks.map(fn => fn());
const allPassed = results.every(passed => passed);

console.log('');

if (!allPassed) {
  console.error('❌ Some system dependencies are missing or not accessible.');
  console.error('Please install the missing dependencies before running the platform audit.');
  process.exit(1);
}

console.log('✅ All system dependency checks passed.');
process.exit(0);

