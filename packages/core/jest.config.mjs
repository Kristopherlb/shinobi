import path from 'node:path';
import url from 'node:url';
import preset from '../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  ...preset,
  displayName: 'core',
  rootDir: __dirname,
  transform: preset.transform,
  transformIgnorePatterns: preset.transformIgnorePatterns,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    // Map .js imports to .ts for ESM compatibility in tests
    '^(\\.{1,2}/(?:.*/)?src/.+)\\.js$': '$1.ts'
    // NOTE: We do NOT map @shinobi/core here. Package resolution should work via
    // package.json exports with 'development' condition. If tests fail to resolve,
    // this indicates we need to either:
    // 1. Configure Jest/ts-jest to respect the 'development' condition, or
    // 2. Migrate to Vitest (recommended). See docs/testing-workspace-resolution.md
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};
