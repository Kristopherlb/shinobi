import path from 'node:path';
import url from 'node:url';
import preset from '../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  ...preset,
  displayName: 'svc',
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@shinobi/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@shinobi/(.*)$': '<rootDir>/../../packages/$1/src',
    '^@platform/logger$': '<rootDir>/../../packages/core/src/platform/logger/src/index.ts',
    '^@platform/(.*)$': '<rootDir>/../../packages/$1/src'
  },
  coverageDirectory: path.join(__dirname, '../../coverage/apps/svc')
};
