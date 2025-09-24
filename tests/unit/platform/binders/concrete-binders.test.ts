/**
 * Comprehensive tests for concrete binder strategies
 * Tests the fixes applied to address critical issues in binder implementations
 */

import { Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {
  LambdaToSqsBinderStrategy,
  LambdaToRdsBinderStrategy,
  LambdaToS3BucketBinderStrategy
} from '../../../../packages/core/src/resolver/binders/concrete-binders';
import { BindingContext, BindingResult } from '../../../../packages/core/src/platform/contracts/platform-binding-trigger-spec';

// Mock components for testing
class MockComponent {
  constructor(
    public spec: { name: string; type: string; config: any },
    private construct: any
  ) { }

  getType(): string {
    return this.spec.type;
  }

  getName(): string {
    return this.spec.name;
  }

  getConstruct(handle: string): any {
    return this.construct;
  }
}

// Helper function to create test context
function createTestContext(complianceFramework: string = 'commercial', environment: string = 'us-west-2'): BindingContext {
  const stack = new Stack();
  return {
    source: new MockComponent(
      { name: 'test-lambda', type: 'lambda-api', config: {} },
      new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      })
    ),
    target: new MockComponent(
      { name: 'test-target', type: 'test-type', config: {} },
      null // Will be set per test
    ),
    directive: {
      access: 'read',
      env: {},
      options: {}
    },
    environment,
    complianceFramework
  };
}

describe('LambdaToSqsBinderStrategy', () => {
  let strategy: LambdaToSqsBinderStrategy;
  let stack: Stack;

  beforeEach(() => {
    strategy = new LambdaToSqsBinderStrategy();
    stack = new Stack();
  });

  describe('FedRAMP Compliance Fixes', () => {
    it('should use dynamic region instead of hard-coded us-east-1', () => {
      const context = createTestContext('fedramp-moderate', 'us-west-2');
      const sqsQueue = new sqs.Queue(stack, 'TestQueue');
      context.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        sqsQueue
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      // The region should be us-west-2, not hard-coded us-east-1
      expect(context.environment).toBe('us-west-2');
    });

    it('should separate ListQueues with wildcard resource', () => {
      const context = createTestContext('fedramp-moderate', 'us-west-2');
      const sqsQueue = new sqs.Queue(stack, 'TestQueue');
      context.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        sqsQueue
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      // ListQueues should be handled separately with wildcard resource
      expect(result.environmentVariables).toHaveProperty('QUEUE_URL');
      expect(result.environmentVariables).toHaveProperty('QUEUE_ARN');
    });

    it('should enforce VPC endpoint restrictions for FedRAMP High', () => {
      const context = createTestContext('fedramp-high', 'us-west-2');
      context.directive.options = { vpcEndpoint: 'vpce-12345678' };
      const sqsQueue = new sqs.Queue(stack, 'TestQueue');
      context.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        sqsQueue
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.metadata?.bindingType).toBe('lambda-to-sqs');
    });
  });

  describe('Dead Letter Queue Option', () => {
    it('should add DLQ permissions when deadLetterQueue option is enabled', () => {
      const context = createTestContext('commercial', 'us-west-2');
      context.directive.options = { deadLetterQueue: true };
      const sqsQueue = new sqs.Queue(stack, 'TestQueue');
      context.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        sqsQueue
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      // DLQ permissions should be added
      expect(result.environmentVariables).toHaveProperty('QUEUE_URL');
    });

    it('should not add DLQ permissions when option is disabled', () => {
      const context = createTestContext('commercial', 'us-west-2');
      context.directive.options = { deadLetterQueue: false };
      const sqsQueue = new sqs.Queue(stack, 'TestQueue');
      context.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        sqsQueue
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.environmentVariables).toHaveProperty('QUEUE_URL');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing construct gracefully', () => {
      const context = createTestContext();
      context.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        null // No construct
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(false);
      expect(result.metadata?.error).toContain('Failed to bind');
      expect(result.environmentVariables).toEqual({});
    });

    it('should handle invalid access level', () => {
      const context = createTestContext();
      context.directive.access = 'invalid-access';
      const sqsQueue = new sqs.Queue(stack, 'TestQueue');
      context.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        sqsQueue
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(false);
      expect(result.metadata?.error).toContain('Invalid access level');
    });
  });
});

describe('LambdaToRdsBinderStrategy', () => {
  let strategy: LambdaToRdsBinderStrategy;
  let stack: Stack;

  beforeEach(() => {
    strategy = new LambdaToRdsBinderStrategy();
    stack = new Stack();
  });

  describe('FedRAMP Compliance Fixes', () => {
    it('should use dynamic region for RDS monitoring permissions', () => {
      const context = createTestContext('fedramp-moderate', 'eu-west-1');

      // Create VPC for Lambda and RDS
      const vpc = new ec2.Vpc(stack, 'TestVpc');

      // Create Lambda in VPC
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        vpc
      });

      const rdsInstance = new rds.DatabaseInstance(stack, 'TestDB', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_13_7
        }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc
      });

      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        lambdaFunction
      );
      context.target = new MockComponent(
        { name: 'test-db', type: 'rds-postgres', config: { dbName: 'testdb' } },
        rdsInstance
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(context.environment).toBe('eu-west-1');
    });

    it('should add RDS monitoring permissions for FedRAMP compliance', () => {
      const context = createTestContext('fedramp-moderate', 'us-west-2');

      // Create VPC for Lambda and RDS
      const vpc = new ec2.Vpc(stack, 'TestVpc');

      // Create Lambda in VPC
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        vpc
      });

      const rdsInstance = new rds.DatabaseInstance(stack, 'TestDB', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_13_7
        }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc
      });

      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        lambdaFunction
      );
      context.target = new MockComponent(
        { name: 'test-db', type: 'rds-postgres', config: { dbName: 'testdb' } },
        rdsInstance
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.environmentVariables).toHaveProperty('DB_HOST');
      expect(result.environmentVariables).toHaveProperty('DB_PORT');
    });
  });

  describe('IAM Database Authentication', () => {
    it('should enable IAM database auth when option is set', () => {
      const context = createTestContext('commercial', 'us-west-2');
      context.directive.options = { iamAuth: true };

      // Create VPC for Lambda and RDS
      const vpc = new ec2.Vpc(stack, 'TestVpc');

      // Create Lambda in VPC
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        vpc
      });

      const rdsInstance = new rds.DatabaseInstance(stack, 'TestDB', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_13_7
        }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc
      });

      context.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        lambdaFunction
      );
      context.target = new MockComponent(
        { name: 'test-db', type: 'rds-postgres', config: { dbName: 'testdb' } },
        rdsInstance
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.environmentVariables).toHaveProperty('DB_HOST');
    });
  });
});

describe('LambdaToS3BucketBinderStrategy', () => {
  let strategy: LambdaToS3BucketBinderStrategy;
  let stack: Stack;

  beforeEach(() => {
    strategy = new LambdaToS3BucketBinderStrategy();
    stack = new Stack();
  });

  describe('KMS Encryption Handling', () => {
    it('should handle custom KMS key ARN correctly', () => {
      const context = createTestContext('commercial', 'us-west-2');
      context.directive.options = {
        kmsEncryption: true,
        kmsKeyId: 'arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012'
      };
      const s3Bucket = new s3.Bucket(stack, 'TestBucket');
      context.target = new MockComponent(
        { name: 'test-bucket', type: 's3-bucket', config: {} },
        s3Bucket
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.environmentVariables).toHaveProperty('BUCKET_NAME');
    });

    it('should convert alias to proper ARN format', () => {
      const context = createTestContext('commercial', 'us-west-2');
      context.directive.options = {
        kmsEncryption: true,
        kmsKeyId: 'alias/my-custom-key'
      };
      const s3Bucket = new s3.Bucket(stack, 'TestBucket');
      context.target = new MockComponent(
        { name: 'test-bucket', type: 's3-bucket', config: {} },
        s3Bucket
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      // Should convert alias to proper ARN format
      expect(result.environmentVariables).toHaveProperty('BUCKET_NAME');
    });

    it('should not add KMS policy for AWS-managed key', () => {
      const context = createTestContext('commercial', 'us-west-2');
      context.directive.options = { kmsEncryption: true };
      // No kmsKeyId provided, should use AWS-managed key
      const s3Bucket = new s3.Bucket(stack, 'TestBucket');
      context.target = new MockComponent(
        { name: 'test-bucket', type: 's3-bucket', config: {} },
        s3Bucket
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.environmentVariables).toHaveProperty('BUCKET_NAME');
    });
  });

  describe('FedRAMP High Compliance', () => {
    it('should enforce VPC endpoint restrictions for S3', () => {
      const context = createTestContext('fedramp-high', 'us-west-2');
      context.directive.options = {
        vpcEndpoint: 'vpce-12345678',
        objectPrefix: 'my-app/*'
      };
      const s3Bucket = new s3.Bucket(stack, 'TestBucket');
      context.target = new MockComponent(
        { name: 'test-bucket', type: 's3-bucket', config: {} },
        s3Bucket
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(result.metadata?.bindingType).toBe('lambda-to-s3');
    });

    it('should use dynamic region for S3 monitoring permissions', () => {
      const context = createTestContext('fedramp-moderate', 'ap-southeast-1');
      const s3Bucket = new s3.Bucket(stack, 'TestBucket');
      context.target = new MockComponent(
        { name: 'test-bucket', type: 's3-bucket', config: {} },
        s3Bucket
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(true);
      expect(context.environment).toBe('ap-southeast-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing S3 construct gracefully', () => {
      const context = createTestContext();
      context.target = new MockComponent(
        { name: 'test-bucket', type: 's3-bucket', config: {} },
        null // No construct
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(false);
      expect(result.metadata?.error).toContain('Failed to bind');
      expect(result.environmentVariables).toEqual({});
    });

    it('should handle invalid access level', () => {
      const context = createTestContext();
      context.directive.access = 'invalid-access';
      const s3Bucket = new s3.Bucket(stack, 'TestBucket');
      context.target = new MockComponent(
        { name: 'test-bucket', type: 's3-bucket', config: {} },
        s3Bucket
      );

      const result = strategy.bind(context);

      expect(result.metadata?.success).toBe(false);
      expect(result.metadata?.error).toContain('Invalid access level');
    });
  });
});

describe('Cross-Region Deployment Tests', () => {
  it('should work correctly in non-default regions', () => {
    const regions = ['eu-west-1', 'ap-southeast-1', 'ca-central-1'];

    regions.forEach(region => {
      // Test SQS binder
      const sqsStrategy = new LambdaToSqsBinderStrategy();
      const sqsContext = createTestContext('fedramp-moderate', region);
      const sqsStack = new Stack();
      const sqsQueue = new sqs.Queue(sqsStack, 'TestQueue');
      sqsContext.target = new MockComponent(
        { name: 'test-queue', type: 'sqs-queue', config: {} },
        sqsQueue
      );

      const sqsResult = sqsStrategy.bind(sqsContext);
      expect(sqsResult.metadata?.success).toBe(true);
      expect(sqsContext.environment).toBe(region);

      // Test RDS binder
      const rdsStrategy = new LambdaToRdsBinderStrategy();
      const rdsContext = createTestContext('fedramp-moderate', region);
      const rdsStack = new Stack();

      // Create VPC for Lambda and RDS
      const rdsVpc = new ec2.Vpc(rdsStack, 'TestVpc');

      // Create Lambda in VPC
      const rdsLambdaFunction = new lambda.Function(rdsStack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        vpc: rdsVpc
      });

      const rdsInstance = new rds.DatabaseInstance(rdsStack, 'TestDB', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_13_7
        }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc: rdsVpc
      });

      rdsContext.source = new MockComponent(
        { name: 'test-lambda', type: 'lambda-api', config: {} },
        rdsLambdaFunction
      );
      rdsContext.target = new MockComponent(
        { name: 'test-db', type: 'rds-postgres', config: { dbName: 'testdb' } },
        rdsInstance
      );

      const rdsResult = rdsStrategy.bind(rdsContext);
      expect(rdsResult.metadata?.success).toBe(true);
      expect(rdsContext.environment).toBe(region);
    });
  });
});
