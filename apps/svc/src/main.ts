#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { register as registerTsPaths } from 'tsconfig-paths';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// Ensure ts-node picks up the CLI's tsconfig when running the TypeScript entry point directly.
if (!process.env.TS_NODE_PROJECT) {
  process.env.TS_NODE_PROJECT = path.resolve(moduleDir, '../tsconfig.app.json');
}

const repoRoot = path.resolve(moduleDir, '../../..');
const tsconfigPath = path.resolve(repoRoot, 'tsconfig.base.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  const compilerOptions = tsconfig.compilerOptions ?? {};
  const baseUrl = path.resolve(repoRoot, compilerOptions.baseUrl ?? '.');
  registerTsPaths({
    baseUrl,
    paths: compilerOptions.paths ?? {}
  });
}

// Central CLI entry point. The command registration lives in ./cli/cli.
// Importing this module wires up commander and immediately parses argv.
import './cli/cli.js';
