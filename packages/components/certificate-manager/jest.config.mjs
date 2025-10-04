import baseConfig from '../../../jest.preset.mjs';

export default {
  ...baseConfig,
  displayName: '@platform/components-certificate-manager',
  rootDir: '.',
  testEnvironment: 'node',
  transform: baseConfig.transform,
  transformIgnorePatterns: baseConfig.transformIgnorePatterns,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@shinobi/core$': '<rootDir>/../../core/src/index.ts',
    '^@shinobi/core/(.*)$': '<rootDir>/../../core/src/$1'
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  coverageDirectory: '<rootDir>/coverage'
};
