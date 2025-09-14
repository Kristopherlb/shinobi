module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        baseUrl: '<rootDir>/../../../',
        paths: {
          '@platform/contracts': ['src/platform/contracts'],
          '@platform/logger': ['src/platform/logger'],
          '@platform/tagging': ['src/platform/tagging'],
          '@platform/observability': ['src/platform/observability'],
          '@platform/core-engine': ['src/core-engine'],
          '@platform/bindings': ['src/bindings'],
          '@platform/cli': ['src/cli'],
          '@platform/migration': ['src/migration'],
          '@platform/resolver': ['src/resolver'],
          '@platform/services': ['src/services'],
          '@platform/templates': ['src/templates'],
          '@platform/core': ['src/core-engine'],
          '@platform/*': ['src/components/*']
        }
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@platform/core$': '<rootDir>/tests/setup.ts',
    '^@platform/contracts$': '<rootDir>/tests/setup.ts',
    '^@platform/logger$': '<rootDir>/tests/setup.ts',
    '^@platform/tagging$': '<rootDir>/tests/setup.ts',
    '^@platform/observability$': '<rootDir>/tests/setup.ts',
    '^@platform/core-engine$': '<rootDir>/tests/setup.ts',
    '^@platform/bindings$': '<rootDir>/tests/setup.ts',
    '^@platform/cli$': '<rootDir>/tests/setup.ts',
    '^@platform/migration$': '<rootDir>/tests/setup.ts',
    '^@platform/resolver$': '<rootDir>/tests/setup.ts',
    '^@platform/services$': '<rootDir>/tests/setup.ts',
    '^@platform/templates$': '<rootDir>/tests/setup.ts',
    '^@platform/(.*)$': '<rootDir>/tests/setup.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
};
