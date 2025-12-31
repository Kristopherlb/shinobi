import path from 'node:path';
import url from 'node:url';
import preset from './jest.preset.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
  ...preset,
  // Root-level overrides (minimal - most config comes from preset)
  modulePathIgnorePatterns: [
    '[\\\\/]dist[\\\\/]',
    '<rootDir>/tmp/',
    '<rootDir>/tmp-shinobi/',
    // Ignore nested package.json files that cause Haste map collisions
    '<rootDir>/packages/core/src/platform/logger/package.json'
  ],
  // Coverage configuration moved to Nx target options in project.json files
  // Remove root-level coverage config to avoid conflicts with Nx executor
};
