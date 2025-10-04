import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  ...baseConfig,
  displayName: '@platform/components-cloudfront-distribution',
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
