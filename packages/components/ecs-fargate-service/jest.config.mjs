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
    ...preset.moduleNameMapper
  }
};

