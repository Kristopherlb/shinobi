// Mock implementation of @shinobi/core-logger for testing
import { vi } from 'vitest';

export const Logger = {
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  setGlobalContext: vi.fn(),
};
