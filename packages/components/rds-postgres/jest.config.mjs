import path from 'node:path';
import url from 'node:url';
import preset from '../../../jest.preset.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...preset,
  displayName: '@platform/components-rds-postgres',
  rootDir,
  testMatch: ['<rootDir>/packages/components/rds-postgres/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/rds-postgres/src/**/*.{ts,tsx}', '!packages/components/rds-postgres/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/rds-postgres/coverage'),
  moduleNameMapper: {
    ...preset.moduleNameMapper
  }
};