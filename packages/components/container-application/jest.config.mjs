import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/components-container-application',
  rootDir,
  testMatch: ['<rootDir>/packages/components/container-application/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/container-application/src/**/*.{ts,tsx}', '!packages/components/container-application/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/container-application/coverage'),
  setupFilesAfterEnv: ['<rootDir>/packages/components/container-application/tests/setup.cjs']
};
