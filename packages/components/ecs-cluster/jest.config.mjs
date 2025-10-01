import path from 'node:path';
import url from 'node:url';
import preset from '../../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...preset,
  rootDir,
  coverageDirectory: path.join(rootDir, 'coverage', 'packages', 'components', 'ecs-cluster'),
  moduleNameMapper: {
    '^@platform/(.*)$': '<rootDir>/packages/$1/src',
    '^@shinobi/observability-handlers$': '<rootDir>/packages/observability-handlers/src/index.ts',
    '^@shinobi/components/(.+)/(.+)$': '<rootDir>/packages/components/$1/src/$2.ts'
  },
  testMatch: ['<rootDir>/packages/components/ecs-cluster/tests/**/*.test.ts']
};
