const path = require('path');
const preset = require('../../../jest.preset.cjs');

const rootDir = path.resolve(__dirname, '../../..');

module.exports = {
  ...preset,
  rootDir,
  testMatch: [
    '<rootDir>/packages/components/s3-bucket/tests/**/*.test.ts'
  ],
  coverageDirectory: path.join(rootDir, 'coverage', 'packages', 'components', 's3-bucket'),
  moduleNameMapper: {
    '^@platform/logger$': '<rootDir>/packages/components/s3-bucket/tests/__mocks__/platform-logger.ts',
    '^@platform/contracts$': '<rootDir>/packages/core/src/platform/contracts/index.ts',
    '^@platform/(.*)$': '<rootDir>/packages/$1/src',
    '^@shinobi/observability-handlers$': '<rootDir>/packages/observability-handlers/src/index.ts'
  }
};
