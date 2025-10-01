export default {
  displayName: '@platform/components-lambda-api',
  testEnvironment: 'node',
  transform: { '^.+\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@shinobi/core$': '<rootDir>/../../../packages/core/src/index.ts',
    '^@platform/contracts$': '<rootDir>/../../../packages/contracts/src/index.ts',
    '^@platform/contracts/(.*)$': '<rootDir>/../../../packages/contracts/src/$1'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};