/**
 * Test setup for IAM Role Component
 * 
 * Provides mocks and test utilities for IAM role component testing.
 */
import { vi } from 'vitest';

// Mock AWS CDK constructs
vi.mock('aws-cdk-lib', () => ({
  Duration: {
    seconds: vi.fn((seconds) => seconds)
  },
  Stack: vi.fn().mockImplementation(() => ({
    node: {
      id: 'test-stack',
      addChild: vi.fn()
    }
  })),
  App: vi.fn().mockImplementation(() => ({
    node: {
      id: 'test-app',
      addChild: vi.fn()
    }
  }))
}));

vi.mock('aws-cdk-lib/aws-iam', () => ({
  Role: vi.fn().mockImplementation(() => ({
    roleArn: 'arn:aws:iam::123456789012:role/test-role',
    roleName: 'test-role',
    roleId: 'AROA1234567890EXAMPLE',
    node: {
      id: 'test-role',
      addChild: vi.fn()
    }
  })),
  ServicePrincipal: vi.fn().mockImplementation((service) => ({ service })),
  ArnPrincipal: vi.fn().mockImplementation((arn) => ({ arn })),
  AccountPrincipal: vi.fn().mockImplementation((account) => ({ account })),
  CompositePrincipal: vi.fn().mockImplementation(() => ({
    addToPolicy: vi.fn()
  })),
  ManagedPolicy: {
    fromManagedPolicyArn: vi.fn().mockImplementation((scope, id, arn) => ({ arn }))
  },
  PolicyStatement: vi.fn().mockImplementation((props) => props),
  PolicyDocument: vi.fn().mockImplementation((props) => props),
  Effect: {
    ALLOW: 'Allow',
    DENY: 'Deny'
  }
}));

// Mock CDK assertions
vi.mock('aws-cdk-lib/assertions', () => ({
  Template: {
    fromStack: vi.fn().mockImplementation(() => ({
      hasResourceProperties: vi.fn()
    }))
  }
}));

// Mock platform contracts
vi.mock('@shinobi/core', () => ({
  BaseComponent: vi.fn().mockImplementation(function (this: any) {
    this.applyStandardTags = vi.fn();
    this.registerConstruct = vi.fn();
    this.registerCapability = vi.fn();
    this.validateSynthesized = vi.fn();
    this.logComponentEvent = vi.fn();
    this.logPerformanceMetric = vi.fn();
    this.logResourceCreation = vi.fn();
    this.logError = vi.fn();
    this.capabilities = {};
    this.context = {};
    this.spec = {};
    this.getConstruct = vi.fn();
  })
}));
