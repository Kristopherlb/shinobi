/**
 * Test setup for Cognito User Pool component
 * Provides common test utilities and mocks
 */

import { jest } from '@jest/globals';

// Mock AWS CDK
jest.mock('aws-cdk-lib', () => ({
  Stack: jest.fn().mockImplementation(() => ({
    stackName: 'test-stack',
    region: 'us-east-1',
    account: '123456789012'
  })),
  RemovalPolicy: {
    DESTROY: 'destroy',
    RETAIN: 'retain'
  },
  Duration: {
    days: jest.fn((days) => ({ days })),
    minutes: jest.fn((minutes) => ({ minutes })),
    seconds: jest.fn((seconds) => ({ seconds }))
  }
}));

// Mock Cognito constructs
jest.mock('aws-cdk-lib/aws-cognito', () => ({
  UserPool: jest.fn().mockImplementation(() => ({
    userPoolId: 'test-user-pool-id',
    userPoolArn: 'arn:aws:cognito:us-east-1:123456789012:userpool/test-user-pool-id',
    userPoolProviderName: 'test-provider',
    userPoolProviderUrl: 'https://cognito-idp.us-east-1.amazonaws.com/test-user-pool-id'
  })),
  UserPoolClient: jest.fn().mockImplementation(() => ({
    userPoolClientId: 'test-client-id',
    userPoolClientSecret: 'test-client-secret'
  })),
  UserPoolDomain: jest.fn().mockImplementation(() => ({
    domainName: 'test-domain.auth.us-east-1.amazoncognito.com',
    baseUrl: 'https://test-domain.auth.us-east-1.amazoncognito.com'
  })),
  CfnUserPool: jest.fn().mockImplementation(() => ({
    ref: 'test-user-pool-ref',
    attrArn: 'arn:aws:cognito:us-east-1:123456789012:userpool/test-user-pool-id'
  })),
  CfnUserPoolClient: jest.fn().mockImplementation(() => ({
    ref: 'test-client-ref',
    attrClientSecret: 'test-client-secret'
  })),
  StandardAttributes: {
    EMAIL: 'email',
    PHONE_NUMBER: 'phone_number',
    GIVEN_NAME: 'given_name',
    FAMILY_NAME: 'family_name',
    ADDRESS: 'address',
    BIRTHDATE: 'birthdate',
    GENDER: 'gender'
  },
  SignInAliases: {
    EMAIL: 'email',
    PHONE: 'phone_number',
    USERNAME: 'username',
    PREFERRED_USERNAME: 'preferred_username'
  },
  Mfa: {
    OFF: 'OFF',
    OPTIONAL: 'OPTIONAL',
    REQUIRED: 'REQUIRED'
  },
  AdvancedSecurityMode: {
    OFF: 'OFF',
    AUDIT: 'AUDIT',
    ENFORCED: 'ENFORCED'
  }
}));

// Mock CloudWatch constructs
jest.mock('aws-cdk-lib/aws-cloudwatch', () => ({
  Alarm: jest.fn().mockImplementation(() => ({
    alarmArn: 'arn:aws:cloudwatch:us-east-1:123456789012:alarm:test-alarm',
    alarmName: 'test-alarm'
  })),
  Metric: jest.fn().mockImplementation(() => ({
    metricName: 'test-metric',
    namespace: 'AWS/Cognito'
  })),
  ComparisonOperator: {
    GREATER_THAN_THRESHOLD: 'GreaterThanThreshold',
    LESS_THAN_THRESHOLD: 'LessThanThreshold'
  },
  TreatMissingData: {
    NOT_BREACHING: 'notBreaching',
    BREACHING: 'breaching'
  }
}));

// Mock IAM constructs
jest.mock('aws-cdk-lib/aws-iam', () => ({
  Role: jest.fn().mockImplementation(() => ({
    roleArn: 'arn:aws:iam::123456789012:role/test-role',
    roleName: 'test-role'
  })),
  PolicyStatement: jest.fn().mockImplementation(() => ({
    addActions: jest.fn(),
    addResources: jest.fn(),
    addPrincipals: jest.fn()
  })),
  Effect: {
    ALLOW: 'Allow',
    DENY: 'Deny'
  }
}));

// Mock CDK Labs constructs
jest.mock('@cdklabs/generative-ai-cdk-constructs', () => ({
  // Add any specific mocks needed for CDK Labs constructs
}));

// Global test timeout
jest.setTimeout(30000);

export { };
