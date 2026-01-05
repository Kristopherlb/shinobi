import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@shinobi/components-network-rules-stack',
  rootDir,
  testMatch: ['<rootDir>/packages/components/network-rules-stack/tests/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper
  },
  collectCoverageFrom: [
    'packages/components/network-rules-stack/**/*.ts',
    '!packages/components/network-rules-stack/tests/**/*.ts',
    '!packages/components/network-rules-stack/node_modules/**'
  ],
  coverageDirectory: path.join(rootDir, 'packages/components/network-rules-stack/coverage')
};

