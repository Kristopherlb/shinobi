export default {
  displayName: 'core',
  testEnvironment: 'node',
  transform: { '^.+\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@shinobi/core$': '<rootDir>/src',
    '^@shinobi/(.*)$': '<rootDir>/../$1/src',
    '^@platform/(.*)$': '<rootDir>/../$1/src'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};