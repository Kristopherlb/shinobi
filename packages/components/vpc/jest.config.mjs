import path from 'node:path';
import url from 'node:url';
import preset from '../../../jest.preset.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...preset,
  displayName: '@platform/components-vpc',
  rootDir,
  testMatch: ['<rootDir>/packages/components/vpc/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/vpc/src/**/*.{ts,tsx}', '!packages/components/vpc/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/vpc/coverage'),
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    // Override problematic preset mapper for workspace root structure
    '^(?:\\.{1,2}/)+platform/contracts/(.+)\\.js$': '<rootDir>/packages/core/src/platform/contracts/$1.ts',
    // Override with our specific aliases
    '^@shinobi/core$': '<rootDir>/packages/core/src',
    '^@shinobi/(.*)$': '<rootDir>/packages/$1/src',
    '^@platform/(.*)$': '<rootDir>/packages/$1/src'
  }
};