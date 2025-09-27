import type { Config } from 'jest';

const config: Config = {
  displayName: '@platform/components-api-gateway-rest',
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
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
