import path from 'node:path';
import url from 'node:url';
import preset from '../../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...preset,
  rootDir,
  testMatch: ['<rootDir>/packages/components/s3-bucket/tests/**/*.test.ts'],
  coverageDirectory: path.join(rootDir, 'coverage', 'packages', 'components', 's3-bucket'),
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    // Map .js imports to .ts for ESM compatibility in tests
    '^(\\.{1,2}/(?:.*/)?src/.+)\\.js$': '$1.ts',
    // Mock for platform logger in tests
    '^@platform/logger$': '<rootDir>/packages/components/s3-bucket/tests/__mocks__/platform-logger.ts'
  }
};
