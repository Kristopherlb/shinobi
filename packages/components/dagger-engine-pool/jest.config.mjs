import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/components-dagger-engine-pool',
  rootDir,
  testMatch: ['<rootDir>/packages/components/dagger-engine-pool/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/dagger-engine-pool/src/**/*.{ts,tsx}', '!packages/components/dagger-engine-pool/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/dagger-engine-pool/coverage'),
  setupFilesAfterEnv: ['<rootDir>/packages/components/dagger-engine-pool/tests/setup.ts'],
  moduleNameMapper: {
    '^@platform/tagging-service$': '<rootDir>/packages/components/dagger-engine-pool/tests/mocks/tagging-service.ts',
    ...(baseConfig.moduleNameMapper ?? {})
  }
};
