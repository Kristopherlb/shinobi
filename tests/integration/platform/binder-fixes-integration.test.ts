/**
 * Integration tests for binder strategy fixes
 * Validates that all critical fixes work together in real-world scenarios
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
import { ComputeToIamRoleBinder } from '../../../../packages/core/src/bindings/strategies/compute-to-iam-role.strategy';
import { BindingContext } from '../../../../packages/core/src/platform/contracts/platform-binding-trigger-spec';

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

  get node() {
    return { id: this.spec.name };
  }

  getConstruct(handle: string): any {
    return this.construct;
  }
}

describe('Binder Fixes Integration Tests', () => {
  let stack: Stack;

  beforeEach(() => {
    stack = new Stack();
  });

  describe('FedRAMP High Compliance Integration', () => {
    it('should create a complete FedRAMP High compliant Lambda with all bindings', () => {
      // Create Lambda function
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      // Create VPC for FedRAMP High compliance
      const vpc = new ec2.Vpc(stack, 'TestVpc');
      const vpcEndpoint = new ec2.VpcEndpoint(stack, 'S3VpcEndpoint', {
        vpc,
        service: ec2.VpcEndpointService.S3,
        vpcEndpoints: [ec2.VpcEndpointType.GATEWAY]
      });

      // Create SQS queue
      const sqsQueue = new sqs.Queue(stack, 'TestQueue', {
        deadLetterQueue: {
          queue: new sqs.Queue(stack, 'TestDLQ'),
          maxReceiveCount: 3
        }
      });

      // Create RDS instance
      const rdsInstance = new rds.DatabaseInstance(stack, 'TestDB', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_13_7
        }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc
      });

      // Create S3 bucket
      const s3Bucket = new s3.Bucket(stack, 'TestBucket', {
        encryption: s3.BucketEncryption.S3_MANAGED
      });

      // Create IAM role
      const iamRole = new iam.Role(stack, 'TestRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'TestPolicy': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: ['*']
              })
            ]
          })
        }
      });

      // Test SQS binding with FedRAMP High
      const sqsContext: BindingContext = {
        source: new MockComponent(
          { name: 'test-lambda', type: 'lambda-api', config: {} },
          lambdaFunction
        ),
        target: new MockComponent(
          { name: 'test-queue', type: 'sqs-queue', config: {} },
          sqsQueue
        ),
        directive: {
          access: 'read',
          env: {},
          options: {
            deadLetterQueue: true,
            vpcEndpoint: vpcEndpoint.vpcEndpointId
          }
        },
        environment: 'us-west-2',
        complianceFramework: 'fedramp-high'
      };

      const sqsStrategy = new LambdaToSqsBinderStrategy();
      const sqsResult = sqsStrategy.bind(sqsContext);

      expect(sqsResult.metadata?.success).toBe(true);
      expect(sqsResult.environmentVariables).toHaveProperty('QUEUE_URL');
      expect(sqsResult.environmentVariables).toHaveProperty('QUEUE_ARN');

      // Test RDS binding with FedRAMP Moderate
      const rdsContext: BindingContext = {
        source: new MockComponent(
          { name: 'test-lambda', type: 'lambda-api', config: {} },
          lambdaFunction
        ),
        target: new MockComponent(
          { name: 'test-db', type: 'rds-postgres', config: { dbName: 'testdb' } },
          rdsInstance
        ),
        directive: {
          access: 'read',
          env: {},
          options: { iamAuth: true }
        },
        environment: 'us-west-2',
        complianceFramework: 'fedramp-moderate'
      };

      const rdsStrategy = new LambdaToRdsBinderStrategy();
      const rdsResult = rdsStrategy.bind(rdsContext);

      expect(rdsResult.metadata?.success).toBe(true);
      expect(rdsResult.environmentVariables).toHaveProperty('DB_HOST');
      expect(rdsResult.environmentVariables).toHaveProperty('DB_PORT');

      // Test S3 binding with FedRAMP High
      const s3Context: BindingContext = {
        source: new MockComponent(
          { name: 'test-lambda', type: 'lambda-api', config: {} },
          lambdaFunction
        ),
        target: new MockComponent(
          { name: 'test-bucket', type: 's3-bucket', config: {} },
          s3Bucket
        ),
        directive: {
          access: 'readwrite',
          env: {},
          options: {
            kmsEncryption: true,
            kmsKeyId: 'alias/my-custom-key',
            vpcEndpoint: vpcEndpoint.vpcEndpointId,
            objectPrefix: 'my-app/*'
          }
        },
        environment: 'us-west-2',
        complianceFramework: 'fedramp-high'
      };

      const s3Strategy = new LambdaToS3BucketBinderStrategy();
      const s3Result = s3Strategy.bind(s3Context);

      expect(s3Result.metadata?.success).toBe(true);
      expect(s3Result.environmentVariables).toHaveProperty('BUCKET_NAME');

      // Test IAM role binding
      const iamContext: BindingContext = {
        source: new MockComponent(
          { name: 'test-lambda', type: 'lambda-api', config: {} },
          lambdaFunction
        ),
        target: new MockComponent(
          { name: 'test-role', type: 'iam-role', config: {} },
          iamRole
        ),
        directive: {
          access: 'assumeRole',
          env: {},
          options: {}
        },
        environment: 'us-west-2',
        complianceFramework: 'commercial'
      };

      const iamStrategy = new ComputeToIamRoleBinder();
      const iamResult = iamStrategy.bind(iamContext);

      expect(iamResult.metadata?.success).toBe(true);
      expect(iamResult.metadata?.trustPolicyUpdated).toBe(true);
      expect(iamResult.environmentVariables).toHaveProperty('IAM_ROLE_ARN');
    });
  });

  describe('Cross-Region Deployment Integration', () => {
    it('should work correctly in multiple regions', () => {
      const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

      regions.forEach(region => {
        const regionalStack = new Stack();

        // Create Lambda function
        const lambdaFunction = new lambda.Function(regionalStack, 'TestLambda', {
          runtime: lambda.Runtime.NODEJS_18_X,
          handler: 'index.handler',
          code: lambda.Code.fromInline('exports.handler = async () => {}')
        });

        // Create SQS queue
        const sqsQueue = new sqs.Queue(regionalStack, 'TestQueue');

        // Test SQS binding with dynamic region
        const sqsContext: BindingContext = {
          source: new MockComponent(
            { name: 'test-lambda', type: 'lambda-api', config: {} },
            lambdaFunction
          ),
          target: new MockComponent(
            { name: 'test-queue', type: 'sqs-queue', config: {} },
            sqsQueue
          ),
          directive: {
            access: 'read',
            env: {},
            options: {}
          },
          environment: region,
          complianceFramework: 'fedramp-moderate'
        };

        const sqsStrategy = new LambdaToSqsBinderStrategy();
        const sqsResult = sqsStrategy.bind(sqsContext);

        expect(sqsResult.metadata?.success).toBe(true);
        expect(sqsContext.environment).toBe(region);
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle partial failures gracefully', () => {
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      // Test with missing target construct
      const sqsContext: BindingContext = {
        source: new MockComponent(
          { name: 'test-lambda', type: 'lambda-api', config: {} },
          lambdaFunction
        ),
        target: new MockComponent(
          { name: 'test-queue', type: 'sqs-queue', config: {} },
          null // Missing construct
        ),
        directive: {
          access: 'read',
          env: {},
          options: {}
        },
        environment: 'us-west-2',
        complianceFramework: 'commercial'
      };

      const sqsStrategy = new LambdaToSqsBinderStrategy();
      const sqsResult = sqsStrategy.bind(sqsContext);

      expect(sqsResult.metadata?.success).toBe(false);
      expect(sqsResult.metadata?.error).toContain('Failed to bind');
      expect(sqsResult.environmentVariables).toEqual({});

      // Test with valid target construct
      const validSqsQueue = new sqs.Queue(stack, 'ValidQueue');
      sqsContext.target = new MockComponent(
        { name: 'valid-queue', type: 'sqs-queue', config: {} },
        validSqsQueue
      );

      const validResult = sqsStrategy.bind(sqsContext);
      expect(validResult.metadata?.success).toBe(true);
    });
  });

  describe('KMS Encryption Integration', () => {
    it('should handle different KMS key formats correctly', () => {
      const lambdaFunction = new lambda.Function(stack, 'TestLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {}')
      });

      const s3Bucket = new s3.Bucket(stack, 'TestBucket');

      const keyFormats = [
        'alias/my-custom-key',
        'arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012',
        '12345678-1234-1234-1234-123456789012'
      ];

      keyFormats.forEach((keyId, index) => {
        const s3Context: BindingContext = {
          source: new MockComponent(
            { name: 'test-lambda', type: 'lambda-api', config: {} },
            lambdaFunction
          ),
          target: new MockComponent(
            { name: 'test-bucket', type: 's3-bucket', config: {} },
            s3Bucket
          ),
          directive: {
            access: 'readwrite',
            env: {},
            options: {
              kmsEncryption: true,
              kmsKeyId: keyId
            }
          },
          environment: 'us-west-2',
          complianceFramework: 'commercial'
        };

        const s3Strategy = new LambdaToS3BucketBinderStrategy();
        const s3Result = s3Strategy.bind(s3Context);

        expect(s3Result.metadata?.success).toBe(true);
        expect(s3Result.environmentVariables).toHaveProperty('BUCKET_NAME');
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple bindings efficiently', () => {
      const startTime = Date.now();

      // Create multiple Lambda functions
      const lambdaFunctions = Array.from({ length: 10 }, (_, i) =>
        new lambda.Function(stack, `TestLambda${i}`, {
          runtime: lambda.Runtime.NODEJS_18_X,
          handler: 'index.handler',
          code: lambda.Code.fromInline('exports.handler = async () => {}')
        })
      );

      // Create multiple SQS queues
      const sqsQueues = Array.from({ length: 10 }, (_, i) =>
        new sqs.Queue(stack, `TestQueue${i}`)
      );

      // Bind each Lambda to each queue
      const sqsStrategy = new LambdaToSqsBinderStrategy();

      lambdaFunctions.forEach((lambdaFunction, i) => {
        sqsQueues.forEach((sqsQueue, j) => {
          const context: BindingContext = {
            source: new MockComponent(
              { name: `test-lambda-${i}`, type: 'lambda-api', config: {} },
              lambdaFunction
            ),
            target: new MockComponent(
              { name: `test-queue-${j}`, type: 'sqs-queue', config: {} },
              sqsQueue
            ),
            directive: {
              access: 'read',
              env: {},
              options: {}
            },
            environment: 'us-west-2',
            complianceFramework: 'commercial'
          };

          const result = sqsStrategy.bind(context);
          expect(result.metadata?.success).toBe(true);
        });
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });
});
