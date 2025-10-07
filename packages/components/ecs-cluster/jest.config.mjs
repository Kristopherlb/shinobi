import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@shinobi/components-ecs-cluster',
  rootDir,
  testMatch: ['<rootDir>/packages/components/ecs-cluster/tests/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper
  },
  collectCoverageFrom: [
    'packages/components/ecs-cluster/**/*.ts',
    '!packages/components/ecs-cluster/tests/**/*.ts',
    '!packages/components/ecs-cluster/node_modules/**'
  ],
  coverageDirectory: path.join(rootDir, 'packages/components/ecs-cluster/coverage')
};
