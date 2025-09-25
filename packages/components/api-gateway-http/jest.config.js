const baseConfig = require('../../../jest.preset.cjs');

module.exports = {
  ...baseConfig,
  displayName: '@platform/api-gateway-http',
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: baseConfig.transform,
  transformIgnorePatterns: baseConfig.transformIgnorePatterns,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@shinobi/core$': '<rootDir>/../../core/src/index.ts',
    '^@shinobi/core/(.*)$': '<rootDir>/../../core/src/$1',
    '^@platform/contracts$': '<rootDir>/../../contracts/src/index.ts',
    '^@platform/contracts/(.*)$': '<rootDir>/../../contracts/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['<rootDir>/**/*.ts', '!<rootDir>/dist/**', '!<rootDir>/node_modules/**']
};
