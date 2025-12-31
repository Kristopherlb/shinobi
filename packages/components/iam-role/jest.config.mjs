import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/components-iam-role',
  rootDir,
  testMatch: ['<rootDir>/packages/components/iam-role/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/iam-role/src/**/*.{ts,tsx}', '!packages/components/iam-role/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/iam-role/coverage')
};
