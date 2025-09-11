/**
 * Jest setup file for Security Group Import component tests
 */

// Mock AWS CDK constructs for testing
jest.mock('aws-cdk-lib', () => ({
  Stack: jest.fn().mockImplementation(() => ({
    node: { id: 'test-stack' }
  })),
  Duration: {
    seconds: jest.fn((seconds) => seconds)
  }
}));

// Mock constructs library
jest.mock('constructs', () => ({
  Construct: jest.fn().mockImplementation(() => ({
    node: { id: 'test-construct' }
  }))
}));
