export default {
  displayName: '@platform/components-route53-record',
  testEnvironment: 'node',
  transform: { '^.+\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {},
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};