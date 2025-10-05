import baseConfig from '../../../jest.config.mjs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/components-application-load-balancer',
  rootDir,
  testMatch: ['<rootDir>/packages/components/application-load-balancer/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/application-load-balancer/src/**/*.{ts,tsx}', '!packages/components/application-load-balancer/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/application-load-balancer/coverage')
};
