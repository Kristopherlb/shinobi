/**
 * Mock AWS Helpers
 * 
 * Provides utilities for creating mock AWS SDK clients for testing.
 */

import type { CloudFormationClient, GetTemplateCommand } from '@aws-sdk/client-cloudformation';

/**
 * Creates a mock CloudFormation client
 */
export function createMockCloudFormationClient(): CloudFormationClient {
  return {
    send: jest.fn()
  } as unknown as CloudFormationClient;
}

/**
 * Creates a mock GetTemplate response with a template
 */
export function createMockStackResponse(template: any): any {
  return {
    TemplateBody: JSON.stringify(template)
  };
}

/**
 * Creates a mock stack not found error
 */
export function createMockStackNotFoundError(): any {
  const error = new Error('Stack with id does not exist');
  (error as any).name = 'ValidationError';
  return error;
}

/**
 * Creates a mock stack already exists error
 */
export function createMockStackAlreadyExistsError(): any {
  const error = new Error('Stack already exists');
  (error as any).name = 'AlreadyExistsException';
  return error;
}

