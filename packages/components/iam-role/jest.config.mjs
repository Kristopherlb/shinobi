export default {
  displayName: '@platform/components-iam-role',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json'
      }
    ]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '^@shinobi/core$': '<rootDir>/../../core/dist/index.js',
    '^@shinobi/(.*)$': '<rootDir>/../../$1/dist/index.js',
    '^@platform/(.*)$': '<rootDir>/../../$1/src'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};
