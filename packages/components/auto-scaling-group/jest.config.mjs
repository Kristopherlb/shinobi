import path from 'node:path';
import url from 'node:url';
import baseConfig from '../../../jest.config.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
  ...baseConfig,
  displayName: '@platform/auto-scaling-group',
  rootDir: path.resolve(__dirname, '../../..'),
  roots: [__dirname],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageDirectory: path.join(__dirname, 'coverage')
};
