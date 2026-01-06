import path from 'node:path';
import url from 'node:url';
import preset from '../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  ...preset,
  displayName: 'binders',
  rootDir: __dirname,
  transform: preset.transform,
  transformIgnorePatterns: preset.transformIgnorePatterns,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    // Map .js imports to .ts for ESM compatibility in tests
    '^(\\.{1,2}/(?:.*/)?src/.+)\\.js$': '$1.ts'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};

