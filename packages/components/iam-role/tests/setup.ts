/**
 * Test setup for IAM Role Component
 * 
 * Provides mocks and test utilities for IAM role component testing.
 */

// Mock AWS CDK constructs
jest.mock('aws-cdk-lib', () => ({
  Duration: {
    seconds: jest.fn((seconds) => seconds)
  },
  Stack: jest.fn().mockImplementation(() => ({
    node: {
      id: 'test-stack',
      addChild: jest.fn()
    }
  })),
  App: jest.fn().mockImplementation(() => ({
    node: {
      id: 'test-app',
      addChild: jest.fn()
    }
  }))
}));

jest.mock('aws-cdk-lib/aws-iam', () => ({
  Role: jest.fn().mockImplementation(() => ({
    roleArn: 'arn:aws:iam::123456789012:role/test-role',
    roleName: 'test-role',
    roleId: 'AROA1234567890EXAMPLE',
    node: {
      id: 'test-role',
      addChild: jest.fn()
    }
  })),
  ServicePrincipal: jest.fn().mockImplementation((service) => ({ service })),
  ArnPrincipal: jest.fn().mockImplementation((arn) => ({ arn })),
  AccountPrincipal: jest.fn().mockImplementation((account) => ({ account })),
  CompositePrincipal: jest.fn().mockImplementation(() => ({
    addToPolicy: jest.fn()
  })),
  ManagedPolicy: {
    fromManagedPolicyArn: jest.fn().mockImplementation((scope, id, arn) => ({ arn }))
  },
  PolicyStatement: jest.fn().mockImplementation((props) => props),
  PolicyDocument: jest.fn().mockImplementation((props) => props),
  Effect: {
    ALLOW: 'Allow',
    DENY: 'Deny'
  }
}));

// Mock CDK assertions
jest.mock('aws-cdk-lib/assertions', () => ({
  Template: {
    fromStack: jest.fn().mockImplementation(() => ({
      hasResourceProperties: jest.fn()
    }))
  }
}));

// Mock platform contracts
jest.mock('../../@shinobi/core/component', () => ({
  BaseComponent: jest.fn().mockImplementation(function(this: any) {
    this.applyStandardTags = jest.fn();
    this.registerConstruct = jest.fn();
    this.registerCapability = jest.fn();
    this.synth = jest.fn();
    this.getConstruct = jest.fn().mockImplementation((handle: string) => {
      if (handle === 'role' || handle === 'main') {
        return {
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          roleName: 'test-role',
          roleId: 'AROA1234567890EXAMPLE'
        };
      }
      throw new Error(`Unknown construct handle: ${handle}`);
    });
    this.getCapabilities = jest.fn().mockReturnValue({
      'iam:assumeRole': {
        roleArn: 'arn:aws:iam::123456789012:role/test-role',
        roleName: 'test-role',
        principal: 'ec2.amazonaws.com'
      }
    });
    this.getOutputs = jest.fn().mockReturnValue({
      roleArn: 'arn:aws:iam::123456789012:role/test-role',
      roleName: 'test-role',
      roleId: 'AROA1234567890EXAMPLE'
    });
    this.node = {
      id: 'test-component'
    };
  })
}));