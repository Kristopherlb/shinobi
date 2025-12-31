import path from 'node:path';
import url from 'node:url';
import preset from '../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  ...preset,

  displayName: {
    name: 'svc',
    color: 'blue' // Optional: makes it stand out in Nx output
  },

  rootDir: __dirname,
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*.(test|spec).[jt]s?(x)'
  ],

  // Transform and module handling
  transform: {
    '^.+\\.(ts|mts|js|jsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true // Faster compilation
      }
    ]
  },

  moduleFileExtensions: ['ts', 'mts', 'js', 'mjs', 'jsx', 'json', 'node'],

  // Module path aliases (critical for monorepo imports)
  moduleNameMapper: {
    // Inherit from preset first
    ...preset.moduleNameMapper,

    // Shinobi core & packages
    '^@shinobi/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@shinobi/(.*)$': '<rootDir>/../../packages/$1/src',

    // Platform aliases (if used)
    '^@platform/logger$': '<rootDir>/../../packages/core/src/platform/logger/src/index.ts',
    '^@platform/(.*)$': '<rootDir>/../../packages/$1/src'
  },

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: path.join(__dirname, '../../coverage/apps/svc'),
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/',
    '\\.d\\.ts$',
    'src/main.ts' // Exclude entrypoint if not tested
  ],

  // Performance & reliability
  maxWorkers: '50%',
  passWithNoTests: true, // Prevent CI failures during early development

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
