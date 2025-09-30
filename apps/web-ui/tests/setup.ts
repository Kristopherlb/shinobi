/**
 * Test Setup
 * 
 * Global test setup for the web-ui application.
 * Configures mocks and test environment.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Mock the Logger service
const mockLogger = {
  configure: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

vi.mock('@shinobi/observability-handlers', () => ({
  Logger: vi.fn().mockImplementation(() => mockLogger)
}));

// Mock the FeatureFlagService
const mockFeatureFlagService = {
  configure: vi.fn().mockResolvedValue(undefined),
  getClient: vi.fn().mockResolvedValue({}),
  getBooleanValue: vi.fn().mockResolvedValue({
    value: true,
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  getStringValue: vi.fn().mockResolvedValue({
    value: 'default',
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  getNumberValue: vi.fn().mockResolvedValue({
    value: 0,
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  getObjectValue: vi.fn().mockResolvedValue({
    value: {},
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  evaluateFlags: vi.fn().mockResolvedValue({}),
  shutdown: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@shinobi/core', () => ({
  FeatureFlagService: vi.fn().mockImplementation(() => mockFeatureFlagService)
}));

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.npm_package_version = '1.0.0-test';
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
  vi.restoreAllMocks();
});
