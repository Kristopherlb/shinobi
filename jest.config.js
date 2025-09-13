// Feature flag to control which component tests to run
// This can be controlled via:
// 1. Environment variable (for simple override)
// 2. Shinobi feature flag service (for proper feature flagging)
const RUN_AUDITED_ONLY = process.env.SHINOBI_RUN_AUDITED_TESTS_ONLY === 'true' ||
  process.env.SHINOBI_FEATURE_FLAG_RUN_AUDITED_TESTS_ONLY === 'true';

// List of audited components (should match MCP server catalog)
const AUDITED_COMPONENTS = [
  'lambda-api',
  'ecs-cluster',
  'ecr-repository',
  'sagemaker-notebook-instance',
  'ec2-instance'
];

// Build test path ignore patterns for non-audited components
// Use regex patterns to exclude non-audited components
const testPathIgnorePatterns = RUN_AUDITED_ONLY ? [
  // Ignore all component tests except audited ones
  '<rootDir>/packages/components/(?!(lambda-api|ecs-cluster|ecr-repository|sagemaker-notebook-instance|ec2-instance)/).*/tests/.*',
  '<rootDir>/packages/components/(?!(lambda-api|ecs-cluster|ecr-repository|sagemaker-notebook-instance|ec2-instance)/).*/*.test.ts',
  '<rootDir>/packages/components/(?!(lambda-api|ecs-cluster|ecr-repository|sagemaker-notebook-instance|ec2-instance)/).*/*.spec.ts'
] : [];

// Log the test mode
if (RUN_AUDITED_ONLY) {
  console.log('🧪 Running tests in AUDITED-ONLY mode');
  console.log(`📋 Audited components: ${AUDITED_COMPONENTS.join(', ')}`);
  console.log('🚫 Non-audited component tests will be skipped');
  console.log('💡 Use SHINOBI_RUN_AUDITED_TESTS_ONLY=false to run all tests');
} else {
  console.log('🧪 Running tests in FULL mode (all components)');
  console.log('⚠️  This may include many failing tests for non-audited components');
  console.log('💡 Use SHINOBI_RUN_AUDITED_TESTS_ONLY=true to run only audited component tests');
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns,
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