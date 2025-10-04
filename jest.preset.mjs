import path from 'node:path';
import url from 'node:url';
import nxPresetModule from '@nx/jest/preset.js';

const rawPreset = nxPresetModule?.default ?? nxPresetModule;
const { nxPreset, default: _ignoredDefault, ...basePreset } = rawPreset ?? {};

const presetDir = path.dirname(url.fileURLToPath(import.meta.url));

export default {
  ...basePreset,
  resolver: path.join(presetDir, 'tools/jest-resolver.cjs'),
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'default']
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.[tj]sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: true
          },
          target: 'es2022',
          keepClassNames: true
        },
        module: {
          type: 'es6'
        },
        sourceMaps: true
      }
    ]
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid|@aws-sdk)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
  modulePathIgnorePatterns: ['[\\\\/]dist[\\\\/]', '<rootDir>/tmp/', '<rootDir>/tmp-shinobi/'],
  watchPathIgnorePatterns: ['[\\\\/]dist[\\\\/]', '<rootDir>/tmp/', '<rootDir>/tmp-shinobi/'],
  moduleNameMapper: {
    ...(basePreset?.moduleNameMapper ?? {}),
    '^(?:\\.{1,2}/)+platform/contracts/(.+)\\.js$': '<rootDir>/packages/core/src/platform/contracts/$1.ts',
    '^(\\.{1,2}/(?:.*/)?src/.+)\\.js$': '$1.ts'
  },
};
