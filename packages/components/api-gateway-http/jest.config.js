const baseConfig = require('../../../jest.preset.cjs');

module.exports = {
  ...baseConfig,
  displayName: '@platform/components-api-gateway-http',
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: baseConfig.transform,
  transformIgnorePatterns: baseConfig.transformIgnorePatterns,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@shinobi/core$': '<rootDir>/../../core/src/index.ts',
    '^@shinobi/core/(.*)$': '<rootDir>/../../core/src/$1',
    '^@platform/logger$': '<rootDir>/tests/stubs/platform-logger.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['<rootDir>/**/*.ts', '!<rootDir>/dist/**', '!<rootDir>/node_modules/**']
};
