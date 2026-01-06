import path from 'node:path';
import url from 'node:url';
import preset from '../../jest.preset.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  ...preset,

  displayName: {
    name: 'svc',
    color: 'blue' // Optional: makes it stand out in Nx output
  },

  rootDir: __dirname,
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*.(test|spec).[jt]s?(x)'
  ],

  // Transform and module handling - using @swc/jest for consistency with preset
  // Note: If advanced decorator metadata is needed, ts-jest can be used instead

  moduleFileExtensions: ['ts', 'mts', 'js', 'mjs', 'jsx', 'json', 'node'],

  // Module path aliases - removed path aliases, relying on package.json exports and workspace resolution
  moduleNameMapper: {
    ...preset.moduleNameMapper
  },

  // Coverage settings - moved to Nx target options in project.json
  // Remove collectCoverage from here to use Nx target options instead

  // Performance & reliability
  maxWorkers: '50%',
  passWithNoTests: true, // Prevent CI failures during early development

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
