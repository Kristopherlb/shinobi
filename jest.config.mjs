import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
  transform: { '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }] },
  transformIgnorePatterns: ['node_modules/(?!(uuid|@aws-sdk)/)'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  resolver: '@nx/jest/plugins/resolver',
  moduleNameMapper: {
    '^@platform/contracts$': '<rootDir>/packages/core/src/platform/contracts/index.ts',
    '^@platform/logger$': '<rootDir>/packages/core/src/platform/logger/src/index.ts',
    '^@platform/core-engine$': '<rootDir>/packages/core-engine/src/index.ts',
    '^@platform/(.+)$': '<rootDir>/packages/components/$1/src/index.ts',
    '^@shinobi/core$': '<rootDir>/packages/core/src/index.ts',
    '^@shinobi/standards-logging$': '<rootDir>/packages/standards/logging/src/index.ts',
    '^@shinobi/standards-otel$': '<rootDir>/packages/standards/otel/src/index.ts',
    '^@shinobi/standards-tagging$': '<rootDir>/packages/standards/tagging/src/index.ts',
    '^@shinobi/standards-iam-audit$': '<rootDir>/packages/standards/iam-audit/src/index.ts',
    '^@shinobi/standards-deprecation$': '<rootDir>/packages/standards/deprecation/src/index.ts',
    '^@shinobi/mcp-server$': '<rootDir>/apps/shinobi-mcp-server/src/index.ts',
    '^@shinobi/observability-handlers$': '<rootDir>/packages/observability-handlers/src/index.ts',
    '^@shinobi/components/(.+)/(.+)$': '<rootDir>/packages/components/$1/$2.ts',
    '^@shinobi/components/(.+)/src/(.+)$': '<rootDir>/packages/components/$1/src/$2.ts',
    '^@shinobi/core/contracts/(.+)$': '<rootDir>/packages/core/src/platform/contracts/$1',
    '^@binders/(.+)$': '<rootDir>/tests/__mocks__/binders/$1.ts',
    '^@shinobi/standards-otel/observability-handlers$': '<rootDir>/packages/standards/otel/observability-handlers/src/index.ts'
  },
  collectCoverageFrom: ['packages/*/src/**/*.{ts,tsx}', '!packages/*/src/**/*.d.ts'],
  coverageDirectory: path.join(__dirname, 'coverage'),
  coverageReporters: ['text', 'lcov', 'html'],
  coverageProvider: 'v8'
};
