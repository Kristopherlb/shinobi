import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'default']
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.[tj]sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: true
          },
          target: 'es2022',
          keepClassNames: true
        },
        module: {
          type: 'es6'
        },
        sourceMaps: true
      }
    ]
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid|@aws-sdk)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
  modulePathIgnorePatterns: ['[\\\\/]dist[\\\\/]', '<rootDir>/tmp/', '<rootDir>/tmp-shinobi/'],
  watchPathIgnorePatterns: ['[\\\\/]dist[\\\\/]', '<rootDir>/tmp/', '<rootDir>/tmp-shinobi/'],
  moduleNameMapper: {
    '^(?:\\.{1,2}/)+platform/contracts/(.+)\\.js$': '<rootDir>/packages/core/src/platform/contracts/$1.ts',
    '^(\\.{1,2}/(?:.*/)?src/.+)\\.js$': '$1.ts',
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
