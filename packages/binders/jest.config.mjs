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
    // Override the platform/contracts mapping from preset (which assumes repo root)
    // Use correct relative path from packages/binders rootDir
    '^(?:\\.{1,2}/)+platform/contracts/(.+)\\.js$': '<rootDir>/../../packages/core/src/platform/contracts/$1.ts',
    
    // Map @shinobi/binders subpath exports (must come before generic pattern)
    '^@shinobi/binders/(.*)$': '<rootDir>/src/strategies/$1',
    '^@shinobi/binders$': '<rootDir>/src',
    
    // Generic pattern for other @shinobi packages
    '^@shinobi/core$': '<rootDir>/../../packages/core/src',
    '^@shinobi/(.*)$': '<rootDir>/../../packages/$1/src'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};

