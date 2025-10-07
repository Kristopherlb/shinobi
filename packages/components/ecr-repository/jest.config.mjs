import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@shinobi/components-ecr-repository',
  rootDir,
  testMatch: ['<rootDir>/packages/components/ecr-repository/tests/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper
  },
  collectCoverageFrom: [
    'packages/components/ecr-repository/**/*.ts',
    '!packages/components/ecr-repository/tests/**/*.ts',
    '!packages/components/ecr-repository/node_modules/**'
  ],
  coverageDirectory: path.join(rootDir, 'packages/components/ecr-repository/coverage')
};
