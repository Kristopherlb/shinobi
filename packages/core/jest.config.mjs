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
    '^@shinobi/core$': '<rootDir>/src',
    '^@shinobi/(.*)$': '<rootDir>/../$1/src',
    '^@platform/logger$': '<rootDir>/src/platform/logger/src/index.ts',
    '^@platform/(.*)$': '<rootDir>/../$1/src'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};
