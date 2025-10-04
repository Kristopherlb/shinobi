import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const projectRoot = path.dirname(__filename);

/** @type {import('jest').Config} */
const config = {
  displayName: '@platform/components-api-gateway-rest',
  rootDir: projectRoot,
  testEnvironment: 'node',
  resolver: '@nx/jest/plugins/resolver',
  transform: { '^.+\\.[tj]sx?$': ['@swc/jest'] },
  transformIgnorePatterns: ['node_modules/(?!(uuid|@aws-sdk)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^\.\./src/(.*)\\.js$': '<rootDir>/src/$1.ts',
    '^@shinobi/core$': '<rootDir>/../../core/src/index.ts',
    '^@shinobi/core/(.*)$': '<rootDir>/../../core/src/$1'
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverageFrom: [
    '<rootDir>/**/*.ts',
    '!<rootDir>/dist/**',
    '!<rootDir>/node_modules/**',
    '!<rootDir>/tests/**'
  ],
  coverageDirectory: '<rootDir>/coverage'
};

export default config;
