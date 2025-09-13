/**
 * Shared Mock BaseComponent for Testing
 * Provides a consistent, properly extending mock implementation for all component tests
 * 
 * This solves the recurring issue where component tests fail due to improper CDK Construct hierarchy
 */

import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

export interface MockBaseComponentProps {
  id?: string;
  scope?: Construct;
  context?: any;
  spec?: any;
}

/**
 * Mock BaseComponent that properly extends CDK Construct
 * This ensures that AWS resource creation works correctly in tests
 */
export class MockBaseComponent extends Construct {
  protected constructs = new Map<string, any>();
  protected capabilities: Record<string, any> = {};

  public readonly context: any;
  public readonly spec: any;

  constructor(
    scope: Construct,
    id: string,
    context: any,
    spec: any,
    props?: MockBaseComponentProps
  ) {
    super(scope, id);

    this.context = context || {};
    this.spec = spec || {};
  }

  /**
   * Register a construct for later retrieval
   */
  protected registerConstruct(handle: string, construct: any): void {
    this.constructs.set(handle, construct);
  }

  /**
   * Register a capability for later retrieval
   */
  protected registerCapability(key: string, data: any): void {
    this.capabilities[key] = data;
  }

  /**
   * Get a registered construct
   */
  public getConstruct(handle: string): any {
    return this.constructs.get(handle);
  }

  /**
   * Get all capabilities
   */
  public getCapabilities(): Record<string, any> {
    return this.capabilities;
  }

  /**
   * Mock tagging method
   */
  protected applyStandardTags(construct: any): void {
    // Mock implementation - in real tests, this would apply platform tags
    if (construct && typeof construct === 'object') {
      // Ensure the construct has a node property for CDK compatibility
      if (!construct.node) {
        construct.node = { id: 'mock-construct' };
      }
    }
  }

  /**
   * Mock KMS key creation
   */
  protected createKmsKeyIfNeeded(purpose: string): cdk.aws_kms.Key {
    return new cdk.aws_kms.Key(this, `MockKmsKey-${purpose}`, {
      description: `Mock KMS key for ${purpose}`
    });
  }

  /**
   * Mock VPC retrieval
   */
  protected getVpc(): cdk.aws_ec2.IVpc {
    return cdk.aws_ec2.Vpc.fromLookup(this, 'MockVpc', {
      isDefault: true
    });
  }

  /**
   * Mock S3 bucket creation
   */
  protected createArtifactsBucket(kmsKey: cdk.aws_kms.Key): cdk.aws_s3.Bucket {
    return new cdk.aws_s3.Bucket(this, 'MockArtifactsBucket', {
      encryption: cdk.aws_s3.BucketEncryption.KMS,
      encryptionKey: kmsKey
    });
  }

  /**
   * Mock assertion method for guardrails
   */
  protected assert(condition: () => boolean, message: string): void {
    if (!condition()) {
      throw new Error(message);
    }
  }
}

/**
 * Jest mock factory for @platform/core-engine
 * Use this in your test files to mock the BaseComponent
 */
export const createPlatformCoreEngineMock = () => ({
  BaseComponent: MockBaseComponent
});

/**
 * Jest mock factory for @platform/contracts
 * Use this in your test files to mock platform contracts
 */
export const createPlatformContractsMock = () => ({
  ComponentContext: {},
  ComponentSpec: {}
});

/**
 * Jest mock factory for @platform/tagging-service
 * Use this in your test files to mock the tagging service
 */
export const createPlatformTaggingServiceMock = () => ({
  applyComplianceTags: jest.fn((construct: any, tags: any) => {
    // Mock implementation that adds tags to the construct
    if (construct && typeof construct === 'object') {
      Object.entries(tags).forEach(([key, value]) => {
        if (value) {
          cdk.Tags.of(construct).add(key, String(value));
        }
      });
    }
  })
});

/**
 * Complete Jest setup for platform mocks
 * Call this in your test setup files or beforeEach blocks
 */
export const setupPlatformMocks = () => {
  jest.mock('@platform/core-engine', () => createPlatformCoreEngineMock());
  jest.mock('@platform/contracts', () => createPlatformContractsMock());
  jest.mock('@platform/tagging-service', () => createPlatformTaggingServiceMock());
};

/**
 * Create a mock ComponentContext for testing
 */
export const createMockComponentContext = (overrides: any = {}): any => ({
  serviceName: 'test-service',
  environment: 'test',
  complianceFramework: 'commercial',
  owner: 'test-team',
  account: '123456789012',
  region: 'us-east-1',
  scope: undefined, // Will be set by the test
  ...overrides
});

/**
 * Create a mock ComponentSpec for testing
 */
export const createMockComponentSpec = (config: any = {}): any => ({
  name: 'test-component',
  type: 'test-component-type',
  config
});

/**
 * Helper to create a test stack with proper environment
 */
export const createTestStack = (app: cdk.App, id: string = 'TestStack'): cdk.Stack => {
  return new cdk.Stack(app, id, {
    env: {
      account: '123456789012',
      region: 'us-east-1'
    }
  });
};
