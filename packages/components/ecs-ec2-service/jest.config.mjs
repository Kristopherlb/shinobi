import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@shinobi/component-ecs-ec2-service',
  rootDir,
  testMatch: ['<rootDir>/packages/components/ecs-ec2-service/tests/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper
  },
  collectCoverageFrom: [
    'packages/components/ecs-ec2-service/src/**/*.ts',
    '!packages/components/ecs-ec2-service/tests/**/*.ts',
    '!packages/components/ecs-ec2-service/node_modules/**'
  ],
  coverageDirectory: path.join(rootDir, 'packages/components/ecs-ec2-service/coverage')
};

