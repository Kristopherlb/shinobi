import baseConfig from '../../../jest.config.mjs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/components-api-gateway-rest',
  rootDir,
  testMatch: ['<rootDir>/packages/components/api-gateway-rest/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/api-gateway-rest/src/**/*.{ts,tsx}', '!packages/components/api-gateway-rest/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/api-gateway-rest/coverage')
};
