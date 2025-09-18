const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  resolver: '@nx/jest/plugins/resolver',
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]sx?$': ['@swc/jest'] },
  transformIgnorePatterns: ['node_modules/(?!(uuid|@aws-sdk)/)'],
};
