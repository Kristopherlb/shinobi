import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/components-api-gateway-http',
  rootDir,
  testMatch: ['<rootDir>/packages/components/api-gateway-http/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/api-gateway-http/src/**/*.{ts,tsx}', '!packages/components/api-gateway-http/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/api-gateway-http/coverage')
};
