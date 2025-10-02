// Mock implementation of @platform/logger for testing
export const Logger = {
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  setGlobalContext: jest.fn(),
};
