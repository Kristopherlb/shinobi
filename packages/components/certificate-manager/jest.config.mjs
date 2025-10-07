import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/components-certificate-manager',
  rootDir,
  testMatch: ['<rootDir>/packages/components/certificate-manager/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/certificate-manager/src/**/*.{ts,tsx}', '!packages/components/certificate-manager/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/certificate-manager/coverage')
};
