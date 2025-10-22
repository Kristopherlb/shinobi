import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/dynamodb-table',
  rootDir,
  extensionsToTreatAsEsm: [],
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
          type: 'commonjs'
        },
        sourceMaps: true
      }
    ]
  },
  testMatch: ['<rootDir>/packages/components/dynamodb-table/tests/**/*.test.ts'],
  collectCoverageFrom: ['packages/components/dynamodb-table/src/**/*.{ts,tsx}', '!packages/components/dynamodb-table/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/dynamodb-table/coverage')
};
