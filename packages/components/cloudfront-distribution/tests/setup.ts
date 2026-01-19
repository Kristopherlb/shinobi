// Test setup file for CloudFront Distribution component
import { vi } from 'vitest';
import path from 'path';

// Ensure process.cwd() during tests points at the repo root so shared configuration files resolve
const repoRoot = path.resolve(__dirname, '../../../..');
if (process.cwd() !== repoRoot) {
  process.chdir(repoRoot);
}

// Mock the platform logger
vi.mock('@shinobi/core-logger', () => ({
  Logger: {
    getLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    setGlobalContext: vi.fn(),
  },
}));

