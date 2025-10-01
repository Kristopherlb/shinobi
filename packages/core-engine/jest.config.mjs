import url from 'node:url';
import baseConfig from '../../jest.preset.mjs';

const rootDir = url.fileURLToPath(new URL('.', import.meta.url));

export default {
  ...baseConfig,
  displayName: '@platform/core-engine',
  rootDir,
  testEnvironment: 'node',
  transform: baseConfig.transform,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@shinobi/core$': '<rootDir>/../core/src/index.ts'
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage'
};
