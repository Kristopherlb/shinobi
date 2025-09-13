module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@platform/core-engine$': '<rootDir>/src/@platform/core-engine.ts',
    '^@platform/contracts$': '<rootDir>/src/@platform/contracts.ts',
    '^@platform/tagging-service$': '<rootDir>/src/@platform/tagging-service.ts'
  }
};