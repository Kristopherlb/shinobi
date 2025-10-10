// @ts-check
import baseConfig from '../../../jest.preset.mjs';

/** @type {import('jest').Config} */
export default {
  ...baseConfig,
  displayName: 'efs-filesystem',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  coverageDirectory: '../../../coverage/packages/components/efs-filesystem',
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
};

