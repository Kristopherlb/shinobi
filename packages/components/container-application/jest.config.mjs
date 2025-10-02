export default {
  displayName: '@platform/components-container-application',
  preset: '../../../jest.preset.mjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
