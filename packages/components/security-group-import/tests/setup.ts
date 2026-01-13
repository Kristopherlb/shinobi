/**
 * Vitest setup file for Security Group Import component tests
 */
import { vi } from 'vitest';

// Mock AWS CDK constructs for testing
vi.mock('aws-cdk-lib', () => ({
  Stack: vi.fn().mockImplementation(() => ({
    node: { id: 'test-stack' }
  })),
  Duration: {
    seconds: vi.fn((seconds) => seconds)
  }
}));

// Mock constructs library
vi.mock('constructs', () => ({
  Construct: vi.fn().mockImplementation(() => ({
    node: { id: 'test-construct' }
  }))
}));
