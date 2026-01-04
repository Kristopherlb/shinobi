import path from 'node:path';
import url from 'node:url';
import preset from '../../../jest.preset.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...preset,
  displayName: '@shinobi/components-ecs-fargate-service',
  rootDir,
  testMatch: ['<rootDir>/packages/components/ecs-fargate-service/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/ecs-fargate-service/src/**/*.{ts,tsx}', '!packages/components/ecs-fargate-service/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/ecs-fargate-service/coverage'),
  moduleNameMapper: {
    // Include preset mappers first
    ...preset.moduleNameMapper,
    // Override problematic preset mapper for workspace root structure
    '^(?:\\.{1,2}/)+platform/contracts/(.+)\\.js$': '<rootDir>/packages/core/src/platform/contracts/$1.ts',
    // Override with our specific aliases (order matters - specific patterns first)
    '^@shinobi/core-logger$': '<rootDir>/packages/core/src/platform/logger/src/index.ts',
    '^@shinobi/core$': '<rootDir>/packages/core/src',
    '^@shinobi/(.*)$': '<rootDir>/packages/$1/src',
    '^@platform/contracts$': '<rootDir>/packages/core/src/platform/contracts/index.ts',
    '^@platform/(.*)$': '<rootDir>/packages/$1/src'
  }
};

