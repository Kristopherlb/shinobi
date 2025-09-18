const path = require('path');
const preset = require('../../../jest.preset.cjs');

const rootDir = path.resolve(__dirname, '../../..');

module.exports = {
  ...preset,
  rootDir,
  coverageDirectory: path.join(rootDir, 'coverage', 'packages', 'components', 'lambda-api'),
  moduleNameMapper: {
    '^@platform/(.*)$': '<rootDir>/packages/$1/src',
    '^@shinobi/observability-handlers$': '<rootDir>/packages/observability-handlers/src/index.ts',
    '^@shinobi/components/(.+)/(.+)$': '<rootDir>/packages/components/$1/src/$2.ts'
  },
};
