module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@platform/contracts$': '<rootDir>/src/platform/contracts/index.ts',
    '^@platform/logger$': '<rootDir>/src/platform/logger/src/index.ts',
    '^@platform/tagging$': '<rootDir>/src/platform/tagging/src/index.ts',
    '^@platform/observability$': '<rootDir>/src/platform/observability/src/index.ts',
    '^@platform/core-engine$': '<rootDir>/src/core-engine/index.ts',
    '^@platform/bindings$': '<rootDir>/src/bindings/index.ts',
    '^@platform/cli$': '<rootDir>/src/cli/index.ts',
    '^@platform/migration$': '<rootDir>/src/migration/index.ts',
    '^@platform/resolver$': '<rootDir>/src/resolver/index.ts',
    '^@platform/services$': '<rootDir>/src/services/index.ts',
    '^@platform/templates$': '<rootDir>/src/templates/index.ts',
    '^@platform/(.*)$': '<rootDir>/src/components/$1/index.ts'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/dist/**',
    '!src/**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};