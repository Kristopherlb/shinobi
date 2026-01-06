export default {
  displayName: '@platform/components-waf-web-acl',
  testEnvironment: 'node',
  transform: { '^.+\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {},
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts']
};