import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export default {
  ...baseConfig,
  displayName: '@platform/ec2-instance',
  rootDir,
  testMatch: ['<rootDir>/packages/components/ec2-instance/tests/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^\\.\\./@shinobi/core/(.+)\\.ts$': '<rootDir>/packages/core/src/platform/contracts/$1.ts'
  },
  collectCoverageFrom: ['packages/components/ec2-instance/src/**/*.{ts,tsx}', '!packages/components/ec2-instance/src/**/*.d.ts'],
  coverageDirectory: path.join(rootDir, 'packages/components/ec2-instance/coverage')
};
