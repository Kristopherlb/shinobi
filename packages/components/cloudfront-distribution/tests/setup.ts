// Test setup file for CloudFront Distribution component
import { jest } from '@jest/globals';
import path from 'path';

// Ensure process.cwd() during tests points at the repo root so shared configuration files resolve
const repoRoot = path.resolve(__dirname, '../../../..');
if (process.cwd() !== repoRoot) {
  process.chdir(repoRoot);
}

// Mock the platform logger
jest.mock('@platform/logger', () => ({
  Logger: {
    getLogger: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
    setGlobalContext: jest.fn(),
  },
}));

