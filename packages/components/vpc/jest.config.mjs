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
    ...preset.moduleNameMapper
  }
};