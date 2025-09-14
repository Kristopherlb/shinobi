#!/usr/bin/env node
// scripts/check-dependencies.mjs
// Pre-flight dependency checker for Shinobi Platform

import { spawnSync } from 'child_process';

const REQUIRED_DEPENDENCIES = [
  {
    name: 'ripgrep',
    command: 'rg',
    args: ['--version'],
    installInstructions: {
      macos: 'brew install ripgrep',
      ubuntu: 'sudo apt-get install ripgrep',
      windows: 'winget install BurntSushi.ripgrep',
      arch: 'sudo pacman -S ripgrep'
    }
  },
  {
    name: 'Node.js',
    command: 'node',
    args: ['--version'],
    installInstructions: {
      macos: 'brew install node',
      ubuntu: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs',
      windows: 'winget install OpenJS.NodeJS',
      arch: 'sudo pacman -S nodejs npm'
    }
  },
  {
    name: 'npm',
    command: 'npm',
    args: ['--version'],
    installInstructions: {
      macos: 'brew install npm',
      ubuntu: 'sudo apt-get install npm',
      windows: 'winget install OpenJS.NodeJS',
      arch: 'sudo pacman -S npm'
    }
  },
  {
    name: 'Git',
    command: 'git',
    args: ['--version'],
    installInstructions: {
      macos: 'brew install git',
      ubuntu: 'sudo apt-get install git',
      windows: 'winget install Git.Git',
      arch: 'sudo pacman -S git'
    }
  }
];

function checkDependency(dep) {
  console.log(`Checking ${dep.name}...`);

  const result = spawnSync(dep.command, dep.args, {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.status === 0) {
    const version = result.stdout.trim().split('\n')[0];
    console.log(`  ✅ ${dep.name}: ${version}`);
    return true;
  } else {
    console.log(`  ❌ ${dep.name}: Not found`);
    console.log(`     Install with:`);
    Object.entries(dep.installInstructions).forEach(([platform, command]) => {
      console.log(`       ${platform}: ${command}`);
    });
    return false;
  }
}

function detectPlatform() {
  const platform = process.platform;
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'ubuntu';
  if (platform === 'win32') return 'windows';
  return 'unknown';
}

function main() {
  console.log('🔍 Shinobi Platform Dependency Checker\n');

  const platform = detectPlatform();
  console.log(`Platform: ${platform}\n`);

  let allGood = true;

  for (const dep of REQUIRED_DEPENDENCIES) {
    const isInstalled = checkDependency(dep);
    if (!isInstalled) {
      allGood = false;
    }
    console.log();
  }

  if (allGood) {
    console.log('🎉 All dependencies are installed! You can run the platform audit.');
    process.exit(0);
  } else {
    console.log('❌ Some dependencies are missing. Please install them before running the platform audit.');
    process.exit(1);
  }
}

main();
