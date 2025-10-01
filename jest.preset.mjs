import nxPresetModule from '@nx/jest/preset.js';

const rawPreset = nxPresetModule?.default ?? nxPresetModule;
const { nxPreset, default: _ignoredDefault, ...basePreset } = rawPreset ?? {};

export default {
  ...basePreset,
  resolver: '@nx/jest/plugins/resolver',
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]sx?$': ['@swc/jest'] },
  transformIgnorePatterns: ['node_modules/(?!(uuid|@aws-sdk)/)'],
};
